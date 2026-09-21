import { A11yModule } from '@angular/cdk/a11y';
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
import { SectoresService } from '../../admin/sectores-prueba/services/sectores';
import type { Sectores } from '../../admin/sectores-prueba/models/sectores.interface';
import { ComunidadesService } from '../../admin/comunidades/services/comunidades.service';
import type { Comunidad } from '../../admin/comunidades/models/comunidad.interface';
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
  private readonly reportsService = inject(ReportsService);
  private readonly sectoresService = inject(SectoresService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly toast = inject(ToastService);

  // Filtros del reporte de recaudación y morosidad
  readonly fechaCorte = signal('');
  readonly sectorId = signal('');
  readonly comunidadId = signal('');
  readonly contratoId = signal('');
  readonly searchTermTable = signal('');
  readonly isFiltersExpanded = signal(false);

  readonly activeAdvancedFiltersCount = computed(() => {
    let count = 0;
    if (this.sectorId()) count++;
    if (this.comunidadId()) count++;
    if (this.fechaCorte()) count++;
    return count;
  });

  // Catálogos para los dropdowns
  readonly sectores = signal<Sectores[]>([]);
  readonly comunidades = signal<Comunidad[]>([]);

  // Sectores dependientes de la comunidad seleccionada (solo visibles si se elige una comunidad específica)
  readonly sectoresDisponibles = computed<Sectores[]>(() => {
    const comId = this.comunidadId();
    if (!comId) {
      return [];
    }
    return this.sectores().filter((s) => String(s.comunidadId) === comId);
  });

  // Resultados JSON (tabla)
  readonly reportData = signal<OverdueAccountsData | null>(null);
  readonly isLoadingData = signal(false);
  readonly workspaceError = signal('');
  readonly lastFailedAction = signal<FailedReportAction | null>(null);

  readonly contextItems = computed<readonly IReportContextItem[]>(() => {
    const items: IReportContextItem[] = [
      {
        label: 'Fecha de corte',
        value: this.fechaCorte() || 'Hoy',
      },
    ];

    if (this.comunidadId()) {
      const com = this.comunidades().find((c) => String(c.id) === this.comunidadId());
      if (com) {
        items.push({ label: 'Comunidad', value: com.nombre });
      }
    }

    if (this.sectorId()) {
      const sec = this.sectores().find((s) => String(s.sectorId) === this.sectorId());
      if (sec) {
        items.push({ label: 'Sector', value: sec.nombre });
      }
    }

    return items;
  });

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

  private dataRequest: Subscription | null = null;
  private generalPdfRequest: Subscription | null = null;
  private detalleRequest: Subscription | null = null;
  private dataRequestId = 0;
  private generalPdfRequestId = 0;
  private detalleRequestId = 0;

  ngOnInit(): void {
    this.cargarCatalogos();
    // Consulta inicial con la fecha de corte por defecto (hoy en el backend).
    this.consultar();
  }

  private cargarCatalogos(): void {
    this.sectoresService.getAllSectores(1, 100).subscribe({
      next: (res) => this.sectores.set(res.data || []),
    });
    this.comunidadesService.getAllComunidades(1, 100).subscribe({
      next: (res) => this.comunidades.set(res.data || []),
    });
  }

  ngOnDestroy(): void {
    this.cancelDataRequest();
    this.cancelGeneralPdfRequest();
    this.cancelDetalleRequest();
  }

  // ---------- Totales canónicos del universo consultado ----------

  readonly totalMorosidad = computed(() => {
    const d = this.reportData();
    // Si se aplicó un filtro de comunidad en frontend y no hay sectorId de backend, recalcular sobre la comunidad
    if (this.comunidadId() && !this.sectorId()) {
      const list = this.filteredMorosos();
      const sum = list.reduce((acc, item) => acc + (item.saldoPendienteNum || 0), 0);
      return sum.toFixed(2);
    }
    return d?.kpis?.totalMorosidad ?? d?.totalMorosidad ?? '0.00';
  });

  readonly totalMorososCount = computed(() => {
    const d = this.reportData();
    if (this.comunidadId() && !this.sectorId()) {
      return this.filteredMorosos().length;
    }
    return d?.kpis?.totalMorosos ?? d?.meta?.total ?? d?.totalMorosos ?? 0;
  });

  readonly mayorDeuda = computed(() => {
    const d = this.reportData();
    if (this.comunidadId() && !this.sectorId()) {
      const list = this.filteredMorosos();
      if (list.length === 0) return '0.00';
      const max = Math.max(...list.map((item) => item.saldoPendienteNum || 0));
      return max.toFixed(2);
    }
    return d?.kpis?.mayorDeuda ?? d?.mayorDeuda ?? '0.00';
  });

  // ---------- Filas de la tabla ----------

  private readonly morosos = computed<MorosoItem[]>(() => {
    const data = this.reportData();
    return data?.data ?? data?.morosos ?? [];
  });

  readonly filteredMorosos = computed(() => {
    let list = this.morosos();

    const normalize = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    // Filtro por Sector seleccionado
    if (this.sectorId()) {
      const selectedSector = this.sectores().find((s) => String(s.sectorId) === this.sectorId());
      if (selectedSector) {
        const targetSector = normalize(selectedSector.nombre);
        list = list.filter((m) => normalize(m.sectorNombre) === targetSector);
      }
    } else if (this.comunidadId()) {
      // Si seleccionó Comunidad pero no un Sector específico, filtrar por los sectores de esa comunidad
      const nombresSectoresComunidad = this.sectoresDisponibles().map((s) => normalize(s.nombre));
      if (nombresSectoresComunidad.length > 0) {
        list = list.filter((m) => nombresSectoresComunidad.includes(normalize(m.sectorNombre)));
      }
    }

    const term = this.searchTermTable().trim().toLowerCase();
    if (!term) return list;

    // Soporte para búsqueda por múltiples términos (ej.: "andy vera", "001 norte")
    const terms = term.split(/\s+/).filter(Boolean);

    return list.filter((m) => {
      const fullText = normalize(
        [
          m.clienteNombre,
          m.identificacion,
          m.numeroGuia,
          m.sectorNombre,
          m.medidorSerie,
          m.contratoId,
        ].join(' '),
      );

      return terms.every((t) => fullText.includes(normalize(t)));
    });
  });

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
      return 'Ajuste la fecha de corte y presione Actualizar para cargar el reporte de recaudación y morosidad.';
    }
    if (this.morosos().length === 0) {
      return 'No se encontraron cuentas en mora para la fecha de corte seleccionada.';
    }
    return '';
  });

  /** Construye los filtros canónicos compartidos por JSON, PDF y correo. */
  private buildFilters(): IOverdueAccountsFilters {
    const filters: IOverdueAccountsFilters = {};
    const corte = this.fechaCorte();
    const sector = this.sectorId().trim();
    const contrato = this.contratoId().trim();

    if (corte) filters.fechaCorte = corte;
    if (sector) filters.sectorId = sector;
    if (contrato) filters.contratoId = contrato;
    return filters;
  }

  private filterContextKey(): string {
    const filters = this.buildFilters();
    return `${filters.contratoId ?? ''}|${filters.sectorId ?? ''}|${filters.fechaCorte ?? ''}`;
  }

  // ---------- Filtros ----------

  actualizarFechaCorte(value: string): void {
    if (value === this.fechaCorte()) return;
    this.fechaCorte.set(value);
    this.invalidateFilterDependentState();
  }

  actualizarSector(value: string): void {
    if (value === this.sectorId()) return;
    this.sectorId.set(value);
    this.invalidateFilterDependentState();
    this.consultar();
  }

  actualizarComunidad(value: string): void {
    if (value === this.comunidadId()) return;
    this.comunidadId.set(value);
    // Si el sector actualmente seleccionado no pertenece a la comunidad elegida, resetearlo
    if (this.sectorId()) {
      const sigueValido = this.sectoresDisponibles().some(
        (s) => String(s.sectorId) === this.sectorId(),
      );
      if (!sigueValido) {
        this.sectorId.set('');
        this.invalidateFilterDependentState();
        this.consultar();
      }
    }
  }

  onTableSearchInput(value: string): void {
    this.searchTermTable.set(value);
  }

  // ---------- Consultar (carga JSON -> tabla) ----------

  consultar(): void {
    this.cancelDataRequest();

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
    this.sectorId.set('');
    this.comunidadId.set('');
    this.contratoId.set('');
    this.searchTermTable.set('');
    this.reportData.set(null);
    this.generalPdfBlob.set(null);
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
    return `reporte-recaudacion-morosidad-${this.contratoId() || 'general'}.pdf`;
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
}
