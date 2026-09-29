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
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { IClientsListFilters, ISendClientsListEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { ReportEmailDialogComponent } from '../shared/report-email-dialog/report-email-dialog.component';
import {
  IReportContextItem,
  IReportEmailRequest,
  ReportStatus,
} from '../shared/models/report-workspace.model';
import { ReportEmailAttemptTracker } from '../shared/report-email-attempt-tracker';
import { ReportWorkspaceComponent } from '../shared/report-workspace/report-workspace.component';

type DatePreset = 'currentYear' | 'currentMonth' | 'lastMonth' | 'last3Months';
import { ToastService } from '../../../shared/components/toast/toast.service';

type FailedReportAction = 'pdf' | 'email';

@Component({
  selector: 'app-clients-report-list',
  imports: [
    FormsModule,
    DatePickerComponent,
    PdfPreviewerComponent,
    ReportEmailDialogComponent,
    ReportWorkspaceComponent,
  ],
  templateUrl: './client-report-list.html',
  styleUrl: './client-report-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientReportListComponent implements OnInit, OnDestroy {
  private readonly reportsService = inject(ReportsService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly activo = signal('');

  readonly pdfBlob = signal<Blob | null>(null);
  readonly isLoadingPdf = signal(false);
  readonly isExporting = signal(false);
  readonly workspaceError = signal('');
  readonly lastFailedAction = signal<FailedReportAction | null>(null);

  readonly destinatario = signal('');
  readonly subject = signal('');
  readonly isSendingEmail = signal(false);
  readonly isEmailModalOpen = signal(false);

  private routeSubscription: Subscription | null = null;
  private pdfRequest: Subscription | null = null;
  private pdfRequestId = 0;
  private readonly emailAttempt = new ReportEmailAttemptTracker();

  readonly rangoFechaInvalido = computed(
    () => !!this.fechaDesde() && !!this.fechaHasta() && this.fechaDesde() > this.fechaHasta(),
  );

  readonly contextItems = computed<readonly IReportContextItem[]>(() => [
    { label: 'Entidad', value: 'Padrón general de clientes' },
    {
      label: 'Período de ingreso',
      value: `${this.fechaDesde() || 'Inicio'} a ${this.fechaHasta() || 'Hoy'}`,
    },
    { label: 'Estado', value: this.activeStatusLabel() },
  ]);

  readonly workspaceStatus = computed<ReportStatus>(() => {
    if (this.isLoadingPdf()) return 'loading';
    if (this.workspaceError()) return 'error';
    if (!this.pdfBlob()) return 'empty';
    return 'idle';
  });

  readonly workspaceStatusMessage = computed(() => {
    if (this.isLoadingPdf()) return 'Generando el listado oficial de clientes…';
    if (this.workspaceError()) return this.workspaceError();
    if (!this.pdfBlob()) {
      return 'Ajuste los filtros y presione Generar PDF para previsualizar el listado.';
    }
    return '';
  });

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe((params) => {
      const fechaDesde = params['fechaDesde'] ?? '';
      const fechaHasta = params['fechaHasta'] ?? '';
      const activo = params['activo'] ?? '';
      const changed =
        fechaDesde !== this.fechaDesde() ||
        fechaHasta !== this.fechaHasta() ||
        activo !== this.activo();

      this.fechaDesde.set(fechaDesde);
      this.fechaHasta.set(fechaHasta);
      this.activo.set(activo);
      if (changed) this.invalidateFilterDependentState();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.cancelPdfRequest();
  }

  actualizarEstado(value: string): void {
    if (value === this.activo()) return;
    this.activo.set(value);
    this.invalidateFilterDependentState();
  }

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
      case 'currentYear':
        desde.setMonth(0, 1);
        break;
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
    }

    const nextDesde = this.toIsoDate(desde);
    const nextHasta = this.toIsoDate(hasta);
    if (nextDesde === this.fechaDesde() && nextHasta === this.fechaHasta()) return;

    this.fechaDesde.set(nextDesde);
    this.fechaHasta.set(nextHasta);
    this.invalidateFilterDependentState();
  }

  generarPdf(): void {
    if (this.rangoFechaInvalido() || this.isLoadingPdf()) return;

    this.cancelPdfRequest();
    const filters = this.buildFilters();
    const contextKey = this.filterContextKey(filters);
    const requestId = ++this.pdfRequestId;
    this.isLoadingPdf.set(true);
    this.pdfRequest = this.reportsService.getClientsListPdf(filters).subscribe({
      next: (blob) => {
        if (requestId !== this.pdfRequestId || contextKey !== this.filterContextKey()) return;
        this.pdfBlob.set(blob);
        this.isLoadingPdf.set(false);
        this.clearWorkspaceError();
      },
      error: (err) => {
        if (requestId !== this.pdfRequestId || contextKey !== this.filterContextKey()) return;
        this.isLoadingPdf.set(false);
        this.setWorkspaceError(err, 'No se pudo generar el PDF del reporte', 'pdf');
      },
    });
  }

  descargarPdf(): void {
    const blob = this.pdfBlob();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `listado-clientes-${this.activo() || 'todos'}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  descargarExcel(): void {
    const filters = this.buildFilters();
    this.isExporting.set(true);
    this.reportsService.exportClientsList(filters, 'xlsx').subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.reportsService.downloadBlob(blob, `listado-clientes-${this.activo() || 'todos'}.xlsx`);
        this.toastService.success('Reporte Excel descargado exitosamente');
      },
      error: () => {
        this.isExporting.set(false);
        this.toastService.error('No se pudo exportar el reporte en formato Excel');
      },
    });
  }

  descargarCsv(): void {
    const filters = this.buildFilters();
    this.isExporting.set(true);
    this.reportsService.exportClientsList(filters, 'csv').subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.reportsService.downloadBlob(blob, `listado-clientes-${this.activo() || 'todos'}.csv`);
        this.toastService.success('Reporte CSV descargado exitosamente');
      },
      error: () => {
        this.isExporting.set(false);
        this.toastService.error('No se pudo exportar el reporte en formato CSV');
      },
    });
  }

  abrirModalEmail(): void {
    this.isEmailModalOpen.set(true);
  }

  cerrarModalEmail(): void {
    if (!this.isSendingEmail()) this.isEmailModalOpen.set(false);
  }

  enviarEmail(request: IReportEmailRequest): void {
    const filters = this.buildFilters();
    const requestBody = {
      destinatario: request.destinatario,
      subject: request.subject,
      filtros: filters,
    };
    const body: ISendClientsListEmailBody = {
      ...requestBody,
      idempotencyKey: this.emailAttempt.keyFor(requestBody),
    };

    this.destinatario.set(request.destinatario);
    this.subject.set(request.subject ?? '');
    this.isSendingEmail.set(true);
    this.reportsService.sendClientsListEmail(body).subscribe({
      next: () => {
        this.emailAttempt.clear();
        this.isSendingEmail.set(false);
        this.isEmailModalOpen.set(false);
        this.destinatario.set('');
        this.subject.set('');
        this.clearWorkspaceError();
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
    this.generarPdf();
  }

  limpiar(): void {
    this.cancelPdfRequest();
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.activo.set('');
    this.pdfBlob.set(null);
    this.destinatario.set('');
    this.subject.set('');
    this.emailAttempt.clear();
    this.clearWorkspaceError();
  }

  private buildFilters(): IClientsListFilters {
    const filters: IClientsListFilters = {};
    if (this.fechaDesde()) filters.fechaDesde = this.fechaDesde();
    if (this.fechaHasta()) filters.fechaHasta = this.fechaHasta();
    if (this.activo()) filters.activo = this.activo() === 'true';
    return filters;
  }

  private activeStatusLabel(): string {
    if (this.activo() === 'true') return 'Solo activos';
    if (this.activo() === 'false') return 'Solo inactivos';
    return 'Todos los estados';
  }

  private invalidateFilterDependentState(): void {
    this.cancelPdfRequest();
    this.pdfBlob.set(null);
  }

  private cancelPdfRequest(): void {
    this.pdfRequestId += 1;
    this.pdfRequest?.unsubscribe();
    this.pdfRequest = null;
    this.isLoadingPdf.set(false);
  }

  private filterContextKey(filters = this.buildFilters()): string {
    return `${filters.activo ?? ''}|${filters.fechaDesde ?? ''}|${filters.fechaHasta ?? ''}`;
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

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const inner = (err as { error?: unknown }).error;
      if (inner && typeof inner === 'object' && 'message' in inner) {
        const message = (inner as { message?: unknown }).message;
        if (typeof message === 'string' && message) return message;
      }
    }
    return fallback;
  }
}
