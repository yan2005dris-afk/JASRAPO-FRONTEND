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

import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  IZoneConsumptionFilters,
  ISendReportEmailBody,
} from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { SectoresService } from '../../admin/sectores-prueba/services/sectores';
import type { Sectores } from '../../admin/sectores-prueba/models/sectores.interface';
import { ComunidadesService } from '../../admin/comunidades/services/comunidades.service';
import type { Comunidad } from '../../admin/comunidades/models/comunidad.interface';
import {
  PeriodsService,
  IAccountingPeriod,
} from '../../../shared/services/periods.service';
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

interface ZoneConsumptionRow {
  sectorId: string;
  sectorNombre: string;
  comunidadNombre: string;
  consumoTotal: string;
  consumoTotalNum: number;
  medidoresConLectura: number;
  consumoPromedio: string;
  estimadasCount: number;
  estimadasVolumen: string;
  medidoresSinLectura: number;
  porcentajeSistema: string;
}

interface ZoneConsumptionData {
  data?: ZoneConsumptionRow[];
  meta?: {
    total?: number;
    periodoNombre?: string;
  };
  kpis?: {
    consumoTotalSistema?: string;
    totalZonas?: number;
    zonaMayorConsumo?: string;
    medidoresSinLectura?: number;
  };
  filtros?: {
    periodoNombre?: string;
    definicionesVersion?: string;
  };
  [key: string]: unknown;
}

@Component({
  selector: 'app-zone-consumption',
  imports: [
    A11yModule,
    FormsModule,
    ReportEmailDialogComponent,
    ReportPdfModalComponent,
    ReportWorkspaceComponent,
  ],
  templateUrl: './zone-consumption.html',
  styleUrl: './zone-consumption.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZoneConsumptionComponent implements OnInit, OnDestroy {
  private readonly reportsService = inject(ReportsService);
  private readonly sectoresService = inject(SectoresService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly periodsService = inject(PeriodsService);
  private readonly toast = inject(ToastService);

  // Filtros del reporte de consumo por zonas
  readonly periodoId = signal('');
  readonly comunidadId = signal('');
  readonly sectorId = signal('');
  readonly searchTermTable = signal('');
  readonly isFiltersExpanded = signal(false);

  readonly activeAdvancedFiltersCount = computed(() => {
    let count = 0;
    if (this.periodoId()) count++;
    if (this.comunidadId()) count++;
    if (this.sectorId()) count++;
    return count;
  });

  // Catálogos para los dropdowns
  readonly periodos = signal<IAccountingPeriod[]>([]);
  readonly comunidades = signal<Comunidad[]>([]);
  readonly sectores = signal<Sectores[]>([]);

  // Sectores dependientes de la comunidad seleccionada
  readonly sectoresDisponibles = computed<Sectores[]>(() => {
    const comId = this.comunidadId();
    if (!comId) {
      return [];
    }
    return this.sectores().filter((s) => String(s.comunidadId) === comId);
  });

  // Resultados JSON (tabla)
  readonly reportData = signal<ZoneConsumptionData | null>(null);
  readonly isLoadingData = signal(false);
  readonly isExporting = signal(false);
  readonly workspaceError = signal('');
  readonly lastFailedAction = signal<FailedReportAction | null>(null);

  readonly contextItems = computed<readonly IReportContextItem[]>(() => {
    const items: IReportContextItem[] = [
      {
        label: 'Periodo',
        value: this.reportData()?.meta?.periodoNombre || 'Último cerrado',
      },
    ];

    if (this.comunidadId()) {
      const com = this.comunidades().find(
        (c) => String(c.id) === this.comunidadId(),
      );
      if (com) {
        items.push({ label: 'Comunidad', value: com.nombre });
      }
    }

    if (this.sectorId()) {
      const sec = this.sectores().find(
        (s) => String(s.sectorId) === this.sectorId(),
      );
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

  // Envío por email
  readonly destinatario = signal('');
  readonly subject = signal('');
  readonly isSendingEmail = signal(false);
  readonly isEmailModalOpen = signal(false);
  private readonly emailAttempt = new ReportEmailAttemptTracker();

  private dataRequest: Subscription | null = null;
  private generalPdfRequest: Subscription | null = null;
  private dataRequestId = 0;
  private generalPdfRequestId = 0;

  ngOnInit(): void {
    this.cargarCatalogos();
    // Consulta inicial: el backend usa el último periodo CERRADO por defecto.
    this.consultar();
  }

  private cargarCatalogos(): void {
    this.periodsService.getPeriods().subscribe({
      next: (periods) => this.periodos.set(periods || []),
    });
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
  }

  // ---------- KPIs canónicos del universo consultado ----------

  readonly consumoTotalSistema = computed(
    () => this.reportData()?.kpis?.consumoTotalSistema ?? '0.00',
  );

  readonly totalZonas = computed(
    () => this.reportData()?.kpis?.totalZonas ?? this.zonas().length,
  );

  readonly zonaMayorConsumo = computed(
    () => this.reportData()?.kpis?.zonaMayorConsumo ?? '—',
  );

  readonly medidoresSinLectura = computed(
    () => this.reportData()?.kpis?.medidoresSinLectura ?? 0,
  );

  // ---------- Filas de la tabla ----------

  private readonly zonas = computed<ZoneConsumptionRow[]>(
    () => this.reportData()?.data ?? [],
  );

  readonly filteredZonas = computed(() => {
    const list = this.zonas();
    const term = this.searchTermTable().trim().toLowerCase();
    if (!term) return list;

    const normalize = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toLowerCase();
    const terms = term.split(/\s+/).filter(Boolean);

    return list.filter((z) => {
      const fullText = normalize([z.sectorNombre, z.comunidadNombre].join(' '));
      return terms.every((t) => fullText.includes(normalize(t)));
    });
  });

  readonly workspaceStatus = computed<ReportStatus>(() => {
    if (this.isLoadingData()) return 'loading';
    if (this.workspaceError()) return 'error';
    if (!this.reportData()) return 'empty';
    if (this.zonas().length === 0) return 'empty';
    return 'idle';
  });

  readonly workspaceStatusMessage = computed(() => {
    if (this.isLoadingData()) return 'Consultando el consumo autorizado por zona…';
    if (this.workspaceError()) return this.workspaceError();
    if (!this.reportData()) {
      return 'Seleccione un periodo y presione Actualizar para cargar el consumo por zonas.';
    }
    if (this.zonas().length === 0) {
      return 'No se registró consumo por zona para el periodo seleccionado.';
    }
    return '';
  });

  /** Construye los filtros canónicos compartidos por JSON, PDF y correo. */
  private buildFilters(): IZoneConsumptionFilters {
    const filters: IZoneConsumptionFilters = {};
    const periodo = this.periodoId().trim();
    const comunidad = this.comunidadId().trim();
    const sector = this.sectorId().trim();

    if (periodo) filters.periodoId = periodo;
    if (comunidad) filters.comunidadId = comunidad;
    if (sector) filters.sectorId = sector;
    return filters;
  }

  private filterContextKey(): string {
    const filters = this.buildFilters();
    return `${filters.periodoId ?? ''}|${filters.comunidadId ?? ''}|${filters.sectorId ?? ''}`;
  }

  // ---------- Filtros ----------

  actualizarPeriodo(value: string): void {
    if (value === this.periodoId()) return;
    this.periodoId.set(value);
    this.invalidateFilterDependentState();
    this.consultar();
  }

  actualizarComunidad(value: string): void {
    if (value === this.comunidadId()) return;
    this.comunidadId.set(value);
    // Si el sector seleccionado no pertenece a la comunidad elegida, resetearlo.
    if (this.sectorId()) {
      const sigueValido = this.sectoresDisponibles().some(
        (s) => String(s.sectorId) === this.sectorId(),
      );
      if (!sigueValido) {
        this.sectorId.set('');
      }
    }
    this.invalidateFilterDependentState();
    this.consultar();
  }

  actualizarSector(value: string): void {
    if (value === this.sectorId()) return;
    this.sectorId.set(value);
    this.invalidateFilterDependentState();
    this.consultar();
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
    this.dataRequest = this.reportsService.getZoneConsumption(filters).subscribe({
      next: (data) => {
        if (requestId !== this.dataRequestId || contextKey !== this.filterContextKey())
          return;
        this.reportData.set(data as unknown as ZoneConsumptionData);
        this.isLoadingData.set(false);
        this.clearWorkspaceError();
      },
      error: (err) => {
        if (requestId !== this.dataRequestId || contextKey !== this.filterContextKey())
          return;
        this.isLoadingData.set(false);
        this.setWorkspaceError(
          err,
          'No se pudo cargar el reporte de consumo por zonas',
          'data',
        );
      },
    });
  }

  limpiar(): void {
    this.cancelDataRequest();
    this.cancelGeneralPdfRequest();
    this.periodoId.set('');
    this.comunidadId.set('');
    this.sectorId.set('');
    this.searchTermTable.set('');
    this.reportData.set(null);
    this.generalPdfBlob.set(null);
    this.destinatario.set('');
    this.subject.set('');
    this.emailAttempt.clear();
    this.clearWorkspaceError();
    this.consultar();
  }

  // ---------- PDF general ----------

  generarPdfGeneral(): void {
    this.cancelGeneralPdfRequest();
    this.generalPdfBlob.set(null);
    this.generalPdfError.set('');
    this.isGeneralPdfOpen.set(true);

    const filters = this.buildFilters();
    const contextKey = this.filterContextKey();
    const requestId = ++this.generalPdfRequestId;
    this.isLoadingGeneralPdf.set(true);
    this.generalPdfRequest = this.reportsService
      .getZoneConsumptionPdf(filters)
      .subscribe({
        next: (blob) => {
          if (
            requestId !== this.generalPdfRequestId ||
            contextKey !== this.filterContextKey()
          )
            return;
          this.generalPdfBlob.set(blob);
          this.isLoadingGeneralPdf.set(false);
        },
        error: (err) => {
          if (
            requestId !== this.generalPdfRequestId ||
            contextKey !== this.filterContextKey()
          )
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
    return `reporte-consumo-zonas-${this.periodoId() || 'actual'}.pdf`;
  }

  descargarExcel(): void {
    const filters = this.buildFilters();
    this.isExporting.set(true);
    this.reportsService.exportZoneConsumption(filters, 'xlsx').subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.reportsService.downloadBlob(
          blob,
          `reporte-consumo-zonas-${this.periodoId() || 'actual'}.xlsx`,
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
    this.reportsService.exportZoneConsumption(filters, 'csv').subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.reportsService.downloadBlob(
          blob,
          `reporte-consumo-zonas-${this.periodoId() || 'actual'}.csv`,
        );
        this.toast.success('Reporte CSV descargado exitosamente');
      },
      error: () => {
        this.isExporting.set(false);
        this.toast.error('No se pudo exportar el reporte en formato CSV');
      },
    });
  }

  // ---------- Envío por email ----------

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
    this.reportsService.sendZoneConsumptionEmail(body).subscribe({
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

  private setWorkspaceError(
    err: unknown,
    fallback: string,
    action: FailedReportAction,
  ): void {
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
