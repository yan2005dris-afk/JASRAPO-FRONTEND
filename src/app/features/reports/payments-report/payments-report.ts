import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { resolveClientDisplayName } from '../../../shared/utils/client-display-name';
import { IPaymentsReportFilters, ISendReportEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { ClientsApi } from '../../contracts/clients/data/clients.api';
import type { IClient } from '../../contracts/clients/domain/models/client.model';
import { ReportEmailDialogComponent } from '../shared/report-email-dialog/report-email-dialog.component';
import { ReportFormatTabsComponent } from '../shared/report-format-tabs/report-format-tabs.component';
import {
  IReportContextItem,
  IReportEmailRequest,
  IReportResultColumn,
  IReportResultRow,
  ReportStatus,
} from '../shared/models/report-workspace.model';
import { ReportEmailAttemptTracker } from '../shared/report-email-attempt-tracker';
import { ReportResponsiveResultsComponent } from '../shared/report-responsive-results/report-responsive-results.component';
import { ReportWorkspaceComponent } from '../shared/report-workspace/report-workspace.component';

type DatePreset = 'currentMonth' | 'lastMonth' | 'last3Months' | 'lastYear';
type ReportView = 'table' | 'pdf';
type FailedReportAction = 'data' | 'pdf' | 'email';

interface PaymentRow {
  factura: string;
  fecha: string;
  clienteNombre: string;
  cuenta: string;
  medidor: string;
  emision: string;
  valor: string;
  valorNum?: number;
}

export interface PaymentGroupFila {
  emision: string;
  valor: string;
}

export interface PaymentsReportGroup {
  factura: string;
  fecha: string;
  clienteNombre: string;
  cuenta: string;
  medidor: string;
  filas: PaymentGroupFila[];
  subtotal: string;
}

export interface PaymentsReportDocumentModel {
  titulo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  fechaEmision?: string;
  grupos: PaymentsReportGroup[];
  totalGeneral: string;
  totalRegistros: number;
}

export interface PaymentsReportData {
  reporte?: PaymentsReportDocumentModel;
  pagos?: PaymentRow[];
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  totalGeneral?: string;
  totalRegistros?: number;
  [key: string]: unknown;
}

@Component({
  selector: 'app-payments-report',
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
  templateUrl: './payments-report.html',
  styleUrl: './payments-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsReportComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly reportsService = inject(ReportsService);
  private readonly clientsService = inject(ClientsApi);
  private readonly toast = inject(ToastService);

  // Filtros del reporte de abonos
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly clienteId = signal('');
  readonly selectedClientLabel = signal('');
  readonly selectedClientName = signal('');

  // Vista activa: tabla o PDF
  readonly activeView = signal<ReportView>('table');
  readonly isExporting = signal(false);

  // Resultados
  readonly reportData = signal<PaymentsReportData | null>(null);
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
  private readonly emailAttempt = new ReportEmailAttemptTracker();

  // Modales
  readonly isEmailModalOpen = signal(false);

  // Validación cruzada de fechas: desde no puede ser mayor que hasta
  readonly rangoFechaInvalido = computed(
    () => !!this.fechaDesde() && !!this.fechaHasta() && this.fechaDesde() > this.fechaHasta(),
  );

  readonly tableRows = computed(() => {
    const data = this.reportData();
    if (data?.reporte?.grupos) {
      const flattened: PaymentRow[] = [];
      for (const grupo of data.reporte.grupos) {
        for (const fila of grupo.filas ?? []) {
          flattened.push({
            factura: grupo.factura,
            fecha: grupo.fecha,
            clienteNombre: grupo.clienteNombre,
            cuenta: grupo.cuenta,
            medidor: grupo.medidor,
            emision: fila.emision,
            valor: fila.valor,
            valorNum: Number(fila.valor || 0),
          });
        }
      }
      return flattened;
    }
    return data?.pagos ?? [];
  });

  readonly totalRecaudado = computed(() => {
    const data = this.reportData();
    if (!data) return '0.00';
    if (data.reporte?.totalGeneral !== undefined) return String(data.reporte.totalGeneral);
    if (data.totalGeneral !== undefined) return String(data.totalGeneral);
    const sum = (data.pagos ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0);
    return sum.toFixed(2);
  });

  readonly totalRegistros = computed(() => {
    const data = this.reportData();
    if (!data) return 0;
    if (data.reporte?.totalRegistros !== undefined) return data.reporte.totalRegistros;
    return data.totalRegistros ?? data.pagos?.length ?? 0;
  });

  readonly contextItems = computed<readonly IReportContextItem[]>(() => [
    {
      label: 'Entidad',
      value: this.selectedClientName() || 'Todos los clientes',
    },
    {
      label: 'Período',
      value: `${this.fechaDesde() || 'Inicio'} a ${this.fechaHasta() || 'Hoy'}`,
    },
    {
      label: 'Filtros',
      value: this.clienteId() ? 'Cliente seleccionado' : 'Sin filtro de cliente',
    },
  ]);

  readonly resultColumns: readonly IReportResultColumn[] = [
    { key: 'factura', label: 'Factura' },
    { key: 'fecha', label: 'Fecha Pago' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'cuenta', label: 'Cuenta', align: 'center' },
    { key: 'medidor', label: 'Medidor', align: 'center' },
    { key: 'emision', label: 'Emisión', align: 'center' },
    { key: 'valor', label: 'Valor', align: 'end' },
  ];

  readonly resultRows = computed<readonly IReportResultRow[]>(() =>
    this.tableRows().map((row, index) => ({
      id: `${row.factura}-${row.fecha}-${index}`,
      cells: {
        factura: row.factura,
        fecha: row.fecha,
        cliente: row.clienteNombre,
        cuenta: row.cuenta,
        medidor: row.medidor,
        emision: row.emision,
        valor: `$${row.valor}`,
      },
    })),
  );

  readonly workspaceStatus = computed<ReportStatus>(() => {
    if (this.isLoadingData() || this.isLoadingPdf()) return 'loading';
    if (this.workspaceError()) return 'error';
    if (!this.reportData()) return 'empty';
    if (this.reportData() && this.activeView() === 'table' && this.resultRows().length === 0) {
      return 'empty';
    }
    return 'idle';
  });

  readonly workspaceStatusMessage = computed(() => {
    if (this.isLoadingPdf()) return 'Generando el documento PDF oficial…';
    if (this.isLoadingData()) return 'Consultando datos autorizados del reporte…';
    if (this.workspaceError()) return this.workspaceError();
    if (!this.reportData()) {
      return 'Ajuste los filtros y presione Consultar para cargar el reporte de abonos.';
    }
    if (this.workspaceStatus() === 'empty') {
      return 'No se encontraron abonos para el contexto seleccionado.';
    }
    return '';
  });

  private buildFilters(): IPaymentsReportFilters {
    const filters: IPaymentsReportFilters = {};
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const cliente = this.clienteId().trim();

    if (desde) filters.fechaDesde = desde;
    if (hasta) filters.fechaHasta = hasta;
    if (cliente) filters.clienteId = cliente;
    return filters;
  }

  // ---------- Presets rápidos de rango de fechas ----------

  actualizarFechaDesde(value: string): void {
    if (value === this.fechaDesde()) return;
    this.fechaDesde.set(value);
    this.invalidateFilterDependentState();
  }

  actualizarFechaHasta(value: string): void {
    if (value === this.fechaHasta()) return;
    this.fechaHasta.set(value);
    this.invalidateFilterDependentState();
  }

  aplicarPreset(preset: DatePreset): void {
    const hoy = new Date();
    const desde = new Date(hoy);
    const hasta = new Date(hoy);

    switch (preset) {
      case 'currentMonth':
        desde.setDate(1);
        break;
      case 'lastMonth':
        desde.setMonth(desde.getMonth() - 1, 1);
        hasta.setDate(0);
        break;
      case 'last3Months':
        desde.setMonth(desde.getMonth() - 3);
        break;
      case 'lastYear':
        desde.setFullYear(desde.getFullYear() - 1);
        break;
    }

    const nextDesde = this.toIsoDate(desde);
    const nextHasta = this.toIsoDate(hasta);
    if (nextDesde === this.fechaDesde() && nextHasta === this.fechaHasta()) return;

    this.fechaDesde.set(nextDesde);
    this.fechaHasta.set(nextHasta);
    this.invalidateFilterDependentState();
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    if (this.rangoFechaInvalido()) return;

    this.cancelDataRequest();
    this.cancelPdfRequest();
    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.activeView.set('table');

    const filters = this.buildFilters();
    const contextKey = this.filterContextKey();
    const requestId = ++this.dataRequestId;
    this.isLoadingData.set(true);
    this.dataRequest = this.reportsService.getPaymentsReport(filters).subscribe({
      next: (data) => {
        if (requestId !== this.dataRequestId || contextKey !== this.filterContextKey()) return;
        this.reportData.set(data as unknown as PaymentsReportData);
        this.isLoadingData.set(false);
        this.clearWorkspaceError();
      },
      error: (err) => {
        if (requestId !== this.dataRequestId || contextKey !== this.filterContextKey()) return;
        this.isLoadingData.set(false);
        this.setWorkspaceError(
          err,
          'No se pudieron cargar los datos del reporte de abonos',
          'data',
        );
      },
    });
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
    this.pdfRequest = this.reportsService.getPaymentsReportPdf(filters).subscribe({
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
    this.reportsService.downloadBlob(blob, `reporte-abonos-${this.clienteId() || 'general'}.pdf`);
  }

  descargarExcel(): void {
    const filters = this.buildFilters();
    this.isExporting.set(true);
    this.reportsService.exportPaymentsReport(filters, 'xlsx').subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.reportsService.downloadBlob(
          blob,
          `reporte-abonos-${this.clienteId() || 'general'}.xlsx`,
        );
        this.toast.success('Reporte Excel descargado exitosamente');
      },
      error: () => {
        this.isExporting.set(false);
        this.toast.error('No se pudo exportar el reporte en formato Excel');
      },
    });
  }

  descargarCsv(): void {
    const filters = this.buildFilters();
    this.isExporting.set(true);
    this.reportsService.exportPaymentsReport(filters, 'csv').subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.reportsService.downloadBlob(
          blob,
          `reporte-abonos-${this.clienteId() || 'general'}.csv`,
        );
        this.toast.success('Reporte CSV descargado exitosamente');
      },
      error: () => {
        this.isExporting.set(false);
        this.toast.error('No se pudo exportar el reporte en formato CSV');
      },
    });
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
    const cliente = this.clienteId().trim();
    if (!cliente) {
      this.toast.error('Seleccione un cliente para enviar el reporte', 'Error');
      return;
    }

    this.destinatario.set(request.destinatario);
    this.subject.set(request.subject ?? '');
    const filters = this.buildFilters();
    const requestBody = {
      ...filters,
      clienteId: cliente,
      destinatario: request.destinatario,
      subject: request.subject,
    };
    const body: ISendReportEmailBody = {
      ...requestBody,
      idempotencyKey: this.emailAttempt.keyFor(requestBody),
    };

    this.isSendingEmail.set(true);
    this.reportsService.sendPaymentsReportEmail(body).subscribe({
      next: () => {
        this.emailAttempt.clear();
        this.isSendingEmail.set(false);
        this.isEmailModalOpen.set(false);
        this.destinatario.set('');
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

  limpiar(): void {
    this.cancelDataRequest();
    this.cancelPdfRequest();
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.clienteId.set('');
    this.selectedClientLabel.set('');
    this.selectedClientName.set('');
    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searchError.set('');
    this.searchPerformed.set(false);
    this.destinatario.set('');
    this.subject.set('');
    this.emailAttempt.clear();
    this.activeView.set('table');
    this.clearWorkspaceError();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.cancelDataRequest();
    this.cancelPdfRequest();
  }

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

  private filterContextKey(): string {
    const filters = this.buildFilters();
    return `${filters.clienteId ?? ''}|${filters.fechaDesde ?? ''}|${filters.fechaHasta ?? ''}`;
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
