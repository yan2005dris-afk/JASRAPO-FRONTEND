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

import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IOverdueAccountsFilters, ISendReportEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { ClientsService } from '../../contracts/clients/services/clients.service';
import type { IClient } from '../../contracts/clients/interfaces/iclients.interface';
import { resolveClientDisplayName } from '../../../shared/utils/client-display-name';
import { ReportEmailDialogComponent } from '../shared/report-email-dialog/report-email-dialog.component';
import {
  IReportContextItem,
  IReportEmailRequest,
  ReportStatus,
} from '../shared/models/report-workspace.model';
import { ReportEmailAttemptTracker } from '../shared/report-email-attempt-tracker';
import { ReportPdfModalComponent } from '../shared/report-pdf-modal/report-pdf-modal.component';
import { ReportWorkspaceComponent } from '../shared/report-workspace/report-workspace.component';

type FailedReportAction = 'data' | 'email';

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
    DatePickerComponent,
    ReportEmailDialogComponent,
    ReportPdfModalComponent,
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

  // Resultados JSON (tabla)
  readonly reportData = signal<OverdueAccountsData | null>(null);
  readonly isLoadingData = signal(false);
  readonly workspaceError = signal('');
  readonly lastFailedAction = signal<FailedReportAction | null>(null);

  // Modal PDF general
  readonly isGeneralPdfOpen = signal(false);
  readonly generalPdfBlob = signal<Blob | null>(null);
  readonly isLoadingGeneralPdf = signal(false);
  readonly generalPdfError = signal('');

  // Modal PDF individual (detalle por contrato)
  readonly isDetalleOpen = signal(false);
  readonly detallePdfBlob = signal<Blob | null>(null);
  readonly isLoadingDetalle = signal(false);
  readonly detalleError = signal('');
  readonly detalleTitulo = signal('');
  readonly detalleFileName = signal('reporte-morosidad.pdf');
  private detalleContratoId = '';

  // Envío por email (reporte general)
  readonly destinatario = signal('');
  readonly subject = signal('');
  readonly isSendingEmail = signal(false);
  readonly isEmailModalOpen = signal(false);
  private readonly emailAttempt = new ReportEmailAttemptTracker();

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
  private generalPdfRequest: Subscription | null = null;
  private detalleRequest: Subscription | null = null;
  private dataRequestId = 0;
  private generalPdfRequestId = 0;
  private detalleRequestId = 0;

  ngOnInit(): void {
    // Consulta inicial con la fecha de corte por defecto (hoy en el backend).
    this.consultar();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.cancelDataRequest();
    this.cancelGeneralPdfRequest();
    this.cancelDetalleRequest();
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
    if (this.isLoadingData()) return 'loading';
    if (this.workspaceError()) return 'error';
    if (!this.reportData()) return 'empty';
    if (this.morosos().length === 0) return 'empty';
    return 'idle';
  });

  readonly workspaceStatusMessage = computed(() => {
    if (this.isLoadingData()) return 'Consultando datos autorizados del reporte…';
    if (this.workspaceError()) return this.workspaceError();
    if (!this.reportData()) {
      return 'Ajuste los filtros y presione Consultar para cargar el reporte de recaudación y morosidad.';
    }
    if (this.morosos().length === 0) {
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
    this.reportData.set(null);

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
    this.cancelGeneralPdfRequest();
    this.fechaCorte.set('');
    this.clienteId.set('');
    this.selectedClientLabel.set('');
    this.selectedClientName.set('');
    this.searchTermTable.set('');
    this.reportData.set(null);
    this.generalPdfBlob.set(null);
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searchError.set('');
    this.searchPerformed.set(false);
    this.destinatario.set('');
    this.subject.set('');
    this.emailAttempt.clear();
    this.clearWorkspaceError();
    this.consultar();
  }

  // ---------- PDF general (reporte de toda la ventana) ----------

  generarPdfGeneral(): void {
    this.cancelGeneralPdfRequest();
    this.generalPdfBlob.set(null);
    this.generalPdfError.set('');
    this.isGeneralPdfOpen.set(true);

    const filters = this.buildFilters();
    const contextKey = this.filterContextKey();
    const requestId = ++this.generalPdfRequestId;
    this.isLoadingGeneralPdf.set(true);
    this.generalPdfRequest = this.reportsService.getOverdueAccountsPdf(filters).subscribe({
      next: (blob) => {
        if (requestId !== this.generalPdfRequestId || contextKey !== this.filterContextKey())
          return;
        this.generalPdfBlob.set(blob);
        this.isLoadingGeneralPdf.set(false);
      },
      error: (err) => {
        if (requestId !== this.generalPdfRequestId || contextKey !== this.filterContextKey())
          return;
        this.isLoadingGeneralPdf.set(false);
        this.generalPdfError.set(
          this.getErrorMessage(err, 'No se pudo generar el PDF del reporte'),
        );
      },
    });
  }

  cerrarGeneralPdf(): void {
    this.cancelGeneralPdfRequest();
    this.isGeneralPdfOpen.set(false);
  }

  get generalPdfFileName(): string {
    return `reporte-recaudacion-morosidad-${this.clienteId() || 'general'}.pdf`;
  }

  // ---------- PDF individual (detalle por contrato) ----------

  abrirDetalle(item: MorosoItem): void {
    this.cancelDetalleRequest();
    this.detallePdfBlob.set(null);
    this.detalleError.set('');
    this.detalleContratoId = item.contratoId;
    this.detalleTitulo.set(`Detalle de morosidad — ${item.clienteNombre}`);
    this.detalleFileName.set(`morosidad-${item.numeroGuia || item.contratoId}.pdf`);
    this.isDetalleOpen.set(true);
    this.cargarDetalle();
  }

  private cargarDetalle(): void {
    const filters: IOverdueAccountsFilters = { contratoId: this.detalleContratoId };
    if (this.fechaCorte()) filters.fechaCorte = this.fechaCorte();
    const requestId = ++this.detalleRequestId;
    this.isLoadingDetalle.set(true);
    this.detalleRequest = this.reportsService.getOverdueAccountsPdf(filters).subscribe({
      next: (blob) => {
        if (requestId !== this.detalleRequestId) return;
        this.detallePdfBlob.set(blob);
        this.isLoadingDetalle.set(false);
      },
      error: (err) => {
        if (requestId !== this.detalleRequestId) return;
        this.isLoadingDetalle.set(false);
        this.detalleError.set(this.getErrorMessage(err, 'No se pudo generar el detalle en PDF'));
      },
    });
  }

  retryDetalle(): void {
    this.detalleError.set('');
    this.cargarDetalle();
  }

  cerrarDetalle(): void {
    this.cancelDetalleRequest();
    this.isDetalleOpen.set(false);
  }

  // ---------- Envío por email (reporte general) ----------

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
    const requestBody: ISendReportEmailBody = {
      ...filters,
      destinatario,
      subject: request.subject,
    };
    const body: ISendReportEmailBody = {
      ...requestBody,
      idempotencyKey: this.emailAttempt.keyFor(requestBody),
    };

    this.isSendingEmail.set(true);
    this.reportsService.sendOverdueAccountsEmail(body).subscribe({
      next: () => {
        this.emailAttempt.clear();
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
    if (this.lastFailedAction() === 'email') {
      this.abrirModalEmail();
      return;
    }
    this.consultar();
  }

  // ---------- Helpers privados ----------

  private setWorkspaceError(err: unknown, fallback: string, action: FailedReportAction): void {
    this.workspaceError.set(this.getErrorMessage(err, fallback));
    this.lastFailedAction.set(action);
  }

  private clearWorkspaceError(): void {
    if (this.lastFailedAction() === 'email') this.emailAttempt.clear();
    this.workspaceError.set('');
    this.lastFailedAction.set(null);
  }

  private invalidateFilterDependentState(): void {
    // Al cambiar un filtro, tabla/PDF/correo deben regenerarse desde el mismo
    // universo: se descartan los resultados previos y se exige volver a consultar.
    this.cancelDataRequest();
    this.cancelGeneralPdfRequest();
    this.reportData.set(null);
    this.generalPdfBlob.set(null);
    this.clearWorkspaceError();
  }

  private cancelDataRequest(): void {
    this.dataRequestId += 1;
    this.dataRequest?.unsubscribe();
    this.dataRequest = null;
    this.isLoadingData.set(false);
  }

  private cancelGeneralPdfRequest(): void {
    this.generalPdfRequestId += 1;
    this.generalPdfRequest?.unsubscribe();
    this.generalPdfRequest = null;
    this.isLoadingGeneralPdf.set(false);
  }

  private cancelDetalleRequest(): void {
    this.detalleRequestId += 1;
    this.detalleRequest?.unsubscribe();
    this.detalleRequest = null;
    this.isLoadingDetalle.set(false);
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
