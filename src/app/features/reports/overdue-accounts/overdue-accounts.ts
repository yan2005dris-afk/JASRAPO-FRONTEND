import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IOverdueAccountsFilters, ISendReportEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { ClientsService } from '../../contracts/clients/services/clients.service';
import type { IClient } from '../../contracts/clients/interfaces/iclients.interface';
import { resolveClientDisplayName } from '../../../shared/utils/client-display-name';
import { ReportEmailDialogComponent } from '../shared/report-email-dialog/report-email-dialog.component';
import { ReportFormatTabsComponent } from '../shared/report-format-tabs/report-format-tabs.component';
import {
  IReportContextItem,
  IReportEmailRequest,
  IReportResultColumn,
  IReportResultRow,
  ReportStatus,
} from '../shared/models/report-workspace.model';
import { ReportResponsiveResultsComponent } from '../shared/report-responsive-results/report-responsive-results.component';
import { ReportWorkspaceComponent } from '../shared/report-workspace/report-workspace.component';

type ReportView = 'table' | 'pdf';
type FailedReportAction = 'data' | 'pdf' | 'email';

interface MorosoItem {
  contratoId: string;
  numeroGuia: string;
  clienteNombre: string;
  identificacion: string;
  sectorNombre: string;
  mesesVencidos: number;
  saldoPendiente: string;
  saldoPendienteNum: number;
  ultimaEmision: string;
  medidorSerie: string;
}

interface OverdueAccountsData {
  data?: MorosoItem[];
  meta?: {
    total?: number;
    fechaCorte?: string;
  };
  kpis?: {
    totalMorosidad?: string;
    totalMorosos?: number;
    mayorDeuda?: string;
  };
  // Fallbacks para compatibilidad
  morosos?: MorosoItem[];
  totalMorosos?: number;
  totalMorosidad?: string;
  mayorDeuda?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-overdue-accounts',
  imports: [
    A11yModule,
    FormsModule,
    PdfPreviewerComponent,
    DatePickerComponent,
    ReportEmailDialogComponent,
    ReportFormatTabsComponent,
    ReportResponsiveResultsComponent,
    ReportWorkspaceComponent,
  ],
  templateUrl: './overdue-accounts.html',
  styleUrl: './overdue-accounts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverdueAccountsComponent implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly reportsService = inject(ReportsService);
  private readonly clientsService = inject(ClientsService);
  private readonly toast = inject(ToastService);

  // Filtros del reporte de recaudación y morosidad
  readonly fechaCorte = signal('');
  readonly clienteId = signal('');
  readonly selectedClientLabel = signal('');
  readonly selectedClientName = signal('');
  readonly searchTermTable = signal('');

  // Vista activa: tabla o PDF
  readonly activeView = signal<ReportView>('table');

  // Resultados
  readonly reportData = signal<OverdueAccountsData | null>(null);
  readonly pdfBlob = signal<Blob | null>(null);

  // Estados de carga
  readonly isLoadingData = signal(false);
  readonly isLoadingPdf = signal(false);
  readonly workspaceError = signal('');
  readonly lastFailedAction = signal<FailedReportAction | null>(null);

  // Envío por email
  readonly destinatario = signal('');
  readonly subject = signal('');
  readonly isSendingEmail = signal(false);
  readonly isEmailModalOpen = signal(false);

  // Buscador de clientes
  readonly searchTerm = signal('');
  readonly searchResults = signal<IClient[]>([]);
  readonly isSearching = signal(false);
  readonly searchError = signal('');
  readonly searchPerformed = signal(false);
  readonly isClientPickerOpen = signal(false);
  private clientPickerTrigger: HTMLElement | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private dataRequest: Subscription | null = null;
  private pdfRequest: Subscription | null = null;
  private dataRequestId = 0;
  private pdfRequestId = 0;

  ngOnInit(): void {
    // Consulta inicial con la fecha de corte por defecto (hoy en el backend).
    this.consultar();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.cancelDataRequest();
    this.cancelPdfRequest();
  }

  // ---------- Totales canónicos (provienen del backend, no se recalculan aquí) ----------

  readonly totalMorosidad = computed(() => {
    const d = this.reportData();
    return d?.kpis?.totalMorosidad ?? d?.totalMorosidad ?? '0.00';
  });

  readonly totalMorososCount = computed(() => {
    const d = this.reportData();
    return d?.kpis?.totalMorosos ?? d?.meta?.total ?? d?.totalMorosos ?? 0;
  });

  readonly mayorDeuda = computed(() => {
    const d = this.reportData();
    return d?.kpis?.mayorDeuda ?? d?.mayorDeuda ?? '0.00';
  });

  // ---------- Filas de la tabla ----------

  private readonly morosos = computed<MorosoItem[]>(() => {
    const data = this.reportData();
    return data?.data ?? data?.morosos ?? [];
  });

  readonly filteredMorosos = computed(() => {
    const list = this.morosos();
    const term = this.searchTermTable().trim().toLowerCase();
    if (!term) return list;

    return list.filter(
      (m) =>
        m.clienteNombre.toLowerCase().includes(term) ||
        m.identificacion.toLowerCase().includes(term) ||
        m.numeroGuia.toLowerCase().includes(term) ||
        m.sectorNombre.toLowerCase().includes(term) ||
        m.medidorSerie.toLowerCase().includes(term),
    );
  });

  readonly resultColumns: readonly IReportResultColumn[] = [
    { key: 'numeroGuia', label: 'N° Guía' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'identificacion', label: 'Identificación' },
    { key: 'sector', label: 'Sector' },
    { key: 'mesesVencidos', label: 'Meses Mora', align: 'center' },
    { key: 'ultimaEmision', label: 'Última Emisión', align: 'center' },
    { key: 'saldoPendiente', label: 'Deuda Total', align: 'end' },
  ];

  readonly resultRows = computed<readonly IReportResultRow[]>(() =>
    this.filteredMorosos().map((item, index) => ({
      id: `${item.contratoId || item.numeroGuia}-${index}`,
      cells: {
        numeroGuia: item.numeroGuia,
        cliente: item.clienteNombre,
        identificacion: item.identificacion,
        sector: item.sectorNombre,
        mesesVencidos: `${item.mesesVencidos} ${item.mesesVencidos === 1 ? 'mes' : 'meses'}`,
        ultimaEmision: item.ultimaEmision,
        saldoPendiente: `$${item.saldoPendiente}`,
      },
    })),
  );

  // ---------- Contexto y estado del workspace ----------

  readonly contextItems = computed<readonly IReportContextItem[]>(() => [
    {
      label: 'Entidad',
      value: this.selectedClientName() || 'Todos los clientes',
    },
    {
      label: 'Fecha de corte',
      value: this.fechaCorte() || 'Hoy',
    },
    {
      label: 'Filtros',
      value: this.clienteId() ? 'Cliente seleccionado' : 'Sin filtro de cliente',
    },
  ]);

  readonly workspaceStatus = computed<ReportStatus>(() => {
    if (this.isLoadingData() || this.isLoadingPdf()) return 'loading';
    if (this.workspaceError()) return 'error';
    if (!this.reportData()) return 'empty';
    // El estado vacío del workspace se basa en el universo del backend (morosos),
    // no en la búsqueda local de la tabla: filtrar sin coincidencias no debe
    // ocultar los totales ni marcar el reporte como vacío.
    if (this.activeView() === 'table' && this.morosos().length === 0) {
      return 'empty';
    }
    return 'idle';
  });

  readonly workspaceStatusMessage = computed(() => {
    if (this.isLoadingPdf()) return 'Generando el documento PDF oficial…';
    if (this.isLoadingData()) return 'Consultando datos autorizados del reporte…';
    if (this.workspaceError()) return this.workspaceError();
    if (!this.reportData()) {
      return 'Ajuste los filtros y presione Consultar para cargar el reporte de recaudación y morosidad.';
    }
    if (this.workspaceStatus() === 'empty') {
      return 'No se encontraron cuentas en mora para el contexto seleccionado.';
    }
    return '';
  });

  /** Construye los filtros canónicos compartidos por JSON, PDF y correo. */
  private buildFilters(): IOverdueAccountsFilters {
    const filters: IOverdueAccountsFilters = {};
    const corte = this.fechaCorte();
    const cliente = this.clienteId().trim();

    if (corte) filters.fechaCorte = corte;
    if (cliente) filters.clienteId = cliente;
    return filters;
  }

  private filterContextKey(): string {
    const filters = this.buildFilters();
    return `${filters.clienteId ?? ''}|${filters.fechaCorte ?? ''}`;
  }

  // ---------- Filtros ----------

  actualizarFechaCorte(value: string): void {
    if (value === this.fechaCorte()) return;
    this.fechaCorte.set(value);
    this.invalidateFilterDependentState();
  }

  onTableSearchInput(value: string): void {
    this.searchTermTable.set(value);
  }

  // ---------- Buscador de clientes ----------

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.buscarClientes(), 400);
  }

  abrirBuscadorClientes(): void {
    this.clientPickerTrigger = this.getFocusedElement();
    this.isClientPickerOpen.set(true);
    if (!this.searchPerformed()) {
      this.buscarClientes();
    }
  }

  cerrarBuscadorClientes(): void {
    this.isClientPickerOpen.set(false);
    queueMicrotask(() => this.clientPickerTrigger?.focus());
  }

  onClientPickerBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrarBuscadorClientes();
    }
  }

  buscarClientes(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }

    const term = this.searchTerm().trim();
    if (!term) {
      this.searchResults.set([]);
      this.searchError.set('');
      this.searchPerformed.set(false);
      return;
    }

    this.isSearching.set(true);
    this.searchError.set('');
    this.clientsService.searchClients({ nombreCompleto: term, page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.searchResults.set(res.data);
        this.searchPerformed.set(true);
        this.isSearching.set(false);
      },
      error: (err) => {
        this.searchResults.set([]);
        this.searchPerformed.set(true);
        this.searchError.set(this.getErrorMessage(err, 'No se pudieron buscar los clientes'));
        this.isSearching.set(false);
      },
    });
  }

  seleccionarCliente(cliente: IClient): void {
    this.clienteId.set(String(cliente.clienteId ?? cliente.id ?? cliente.clientId ?? ''));
    const nombre = this.formatClientName(cliente);
    this.selectedClientLabel.set(`${nombre} · ${cliente.identificacion}`);
    this.selectedClientName.set(nombre);
    this.destinatario.set(cliente.email?.trim() ?? '');
    this.invalidateFilterDependentState();
    this.cerrarBuscadorClientes();
  }

  formatClientName(cliente: IClient): string {
    return resolveClientDisplayName(cliente);
  }

  // ---------- Consultar (carga JSON -> tabla) ----------

  consultar(): void {
    this.cancelDataRequest();
    this.cancelPdfRequest();
    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.activeView.set('table');

    const filters = this.buildFilters();
    const contextKey = this.filterContextKey();
    const requestId = ++this.dataRequestId;
    this.isLoadingData.set(true);
    this.dataRequest = this.reportsService.getOverdueAccounts(filters).subscribe({
      next: (data) => {
        if (requestId !== this.dataRequestId || contextKey !== this.filterContextKey()) return;
        this.reportData.set(data as unknown as OverdueAccountsData);
        this.isLoadingData.set(false);
        this.clearWorkspaceError();
      },
      error: (err) => {
        if (requestId !== this.dataRequestId || contextKey !== this.filterContextKey()) return;
        this.isLoadingData.set(false);
        this.setWorkspaceError(
          err,
          'No se pudo cargar el reporte de recaudación y morosidad',
          'data',
        );
      },
    });
  }

  limpiar(): void {
    this.cancelDataRequest();
    this.cancelPdfRequest();
    this.fechaCorte.set('');
    this.clienteId.set('');
    this.selectedClientLabel.set('');
    this.selectedClientName.set('');
    this.searchTermTable.set('');
    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searchError.set('');
    this.searchPerformed.set(false);
    this.destinatario.set('');
    this.subject.set('');
    this.activeView.set('table');
    this.clearWorkspaceError();
    this.consultar();
  }

  // ---------- Toggle de vista ----------

  setView(view: ReportView): void {
    this.activeView.set(view);
    if (view === 'pdf' && !this.pdfBlob() && !this.isLoadingPdf()) {
      this.generarPdf();
    }
  }

  // ---------- Generar PDF ----------

  generarPdf(): void {
    if (this.isLoadingPdf()) return;

    this.cancelPdfRequest();
    this.activeView.set('pdf');
    const filters = this.buildFilters();
    const contextKey = this.filterContextKey();
    const requestId = ++this.pdfRequestId;
    this.isLoadingPdf.set(true);
    this.pdfRequest = this.reportsService.getOverdueAccountsPdf(filters).subscribe({
      next: (blob) => {
        if (requestId !== this.pdfRequestId || contextKey !== this.filterContextKey()) return;
        this.pdfBlob.set(blob);
        this.isLoadingPdf.set(false);
        this.clearWorkspaceError();
      },
      error: (err) => {
        if (requestId !== this.pdfRequestId || contextKey !== this.filterContextKey()) return;
        this.isLoadingPdf.set(false);
        this.activeView.set('table');
        this.setWorkspaceError(err, 'No se pudo generar el PDF del reporte', 'pdf');
      },
    });
  }

  // ---------- Descargar PDF ----------

  descargarPdf(): void {
    const blob = this.pdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    a.href = url;
    a.download = `reporte-recaudacion-morosidad-${this.clienteId() || 'general'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Envío por email (modal) ----------

  abrirModalEmail(): void {
    this.isEmailModalOpen.set(true);
  }

  cerrarModalEmail(): void {
    if (this.isSendingEmail()) {
      return;
    }
    this.isEmailModalOpen.set(false);
  }

  enviarEmail(request: IReportEmailRequest): void {
    const destinatario = request.destinatario.trim();
    if (!destinatario) {
      this.toast.error('Indique un destinatario para enviar el reporte', 'Error');
      return;
    }

    this.destinatario.set(destinatario);
    this.subject.set(request.subject ?? '');
    const filters = this.buildFilters();
    const body: ISendReportEmailBody = {
      ...filters,
      destinatario,
      subject: request.subject,
    };

    this.isSendingEmail.set(true);
    this.reportsService.sendOverdueAccountsEmail(body).subscribe({
      next: () => {
        this.isSendingEmail.set(false);
        this.isEmailModalOpen.set(false);
        this.subject.set('');
        this.clearWorkspaceError();
        this.toast.success('Reporte enviado por email', 'Éxito');
      },
      error: (err) => {
        this.isSendingEmail.set(false);
        this.isEmailModalOpen.set(false);
        this.setWorkspaceError(err, 'No se pudo enviar el reporte por email', 'email');
      },
    });
  }

  retryLastAction(): void {
    switch (this.lastFailedAction()) {
      case 'pdf':
        this.setView('pdf');
        break;
      case 'email':
        this.abrirModalEmail();
        break;
      case 'data':
      default:
        this.consultar();
    }
  }

  // ---------- Helpers privados ----------

  private setWorkspaceError(err: unknown, fallback: string, action: FailedReportAction): void {
    this.workspaceError.set(this.getErrorMessage(err, fallback));
    this.lastFailedAction.set(action);
  }

  private clearWorkspaceError(): void {
    this.workspaceError.set('');
    this.lastFailedAction.set(null);
  }

  private invalidateFilterDependentState(): void {
    // Al cambiar un filtro, tabla/PDF/correo deben regenerarse desde el mismo
    // universo: se descartan los resultados previos y se exige volver a consultar.
    this.cancelDataRequest();
    this.cancelPdfRequest();
    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.activeView.set('table');
    this.clearWorkspaceError();
  }

  private cancelDataRequest(): void {
    this.dataRequestId += 1;
    this.dataRequest?.unsubscribe();
    this.dataRequest = null;
    this.isLoadingData.set(false);
  }

  private cancelPdfRequest(): void {
    this.pdfRequestId += 1;
    this.pdfRequest?.unsubscribe();
    this.pdfRequest = null;
    this.isLoadingPdf.set(false);
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const inner = (err as { error?: unknown }).error;
      if (inner && typeof inner === 'object' && 'message' in inner) {
        const message = (inner as { message?: unknown }).message;
        if (typeof message === 'string' && message) {
          return message;
        }
      }
    }
    return fallback;
  }

  private getFocusedElement(): HTMLElement | null {
    const activeElement = this.document.activeElement;
    return activeElement instanceof HTMLElement ? activeElement : null;
  }
}
