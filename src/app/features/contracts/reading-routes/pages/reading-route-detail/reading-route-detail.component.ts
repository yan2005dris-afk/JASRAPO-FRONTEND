import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ReadingRoutesService } from '../../data/reading-routes.api';
import { LocalDatePipe } from '../../../../../shared/pipes/local-date.pipe';
import {
  IReadingRoute,
  IRouteKpis,
  OrderWork,
  EstadoOrden,
  TipoActividad,
  TipoRuta,
} from '../../models/reading-route.model';
import { ComunidadesService } from '../../../../admin/comunidades/services/comunidades.service';
import { UsersService } from '../../../../users/services/users.service';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { User } from '../../../../users/models/user.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../../../shared/components/table-skeleton/table-skeleton.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import {
  ReadingsTableComponent,
  IReadingRowItem,
} from '../../../readings/components/readings-table/readings-table.component';
import { ReadingDetailModalComponent } from '../../../readings/components/reading-detail-modal/reading-detail-modal.component';
import { ReadingFormModalComponent } from '../../../readings/components/reading-form-modal/reading-form-modal.component';

import { ReadingsService } from '../../../readings/services/readings.service';
import { IReading } from '../../../readings/interfaces/ireading.interface';
import { PeriodsService } from '../../../../../shared/services/periods.service';
import { BlobDownloadService } from '../../../../../shared/infrastructure/blob-download.service';
import {
  ESTADO_ORDEN_BADGE,
  ESTADO_ORDEN_FALLBACK_BADGE,
  TIPO_ACTIVIDAD_BADGE,
  TIPO_ACTIVIDAD_FALLBACK_BADGE,
  TIPO_ACTIVIDAD_LABEL,
  TIPO_RUTA_LABEL,
  ESTADO_FILTER_MAP,
} from '../../domain/constants/route-detail.constants';
import {
  resolveComunidadNombre,
  resolveOperarioNombre,
} from '../../../../../shared/utils/operator-name';
import {
  buildReadingFallback,
  mapLecturaKpisToRouteKpis,
  mapReadingForRouteToRow,
} from '../../domain/rules/kpi-normalize.rules';
import { RouteOrderActionsService } from '../../application/route-order.actions';
import { RouteReadingActionsService } from '../../application/route-reading.actions';
import { RouteStatusService, RouteEstado } from '../../application/route-status.transitions';

type ReadingSource = IReadingRowItem | IReading;
type FilterOrdenTab = 'TODAS' | 'PENDIENTES' | 'COMPLETADAS' | 'NOVEDAD';

@Component({
  selector: 'app-reading-route-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StatusBadgeComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    PaginationComponent,
    LocalDatePipe,
    ReadingsTableComponent,
    ReadingDetailModalComponent,
    ReadingFormModalComponent,
  ],
  templateUrl: './reading-route-detail.component.html',
  styleUrl: './reading-route-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingRouteDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly periodsService = inject(PeriodsService);
  private readonly readingsService = inject(ReadingsService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly blobDownloadService = inject(BlobDownloadService);
  private readonly orderActions = inject(RouteOrderActionsService);
  private readonly readingActions = inject(RouteReadingActionsService);
  private readonly routeStatus = inject(RouteStatusService);

  routeId!: number;
  readingRoute = signal<IReadingRoute | null>(null);
  isLoadingRoute = signal(true);
  isExportingPdf = signal(false);

  // Catalogs (kept as plain arrays because they are read-only lookups for
  // name resolution in the template; the markForCheck() call inside the
  // loaders keeps OnPush happy).
  comunidades: Comunidad[] = [];
  operarios: User[] = [];
  periodos: { periodoId: number; nombre?: string; estado: string }[] = [];

  // Ordenes Table — solo para tipos INSTALACION/RECONEXION/INSPECCION
  ordenes = signal<OrderWork[]>([]);
  isLoadingOrdenes = signal(false);
  totalOrdenes = signal(0);
  routeKpis = signal<IRouteKpis | null>(null);
  currentPage = signal(1);
  pageSize = signal(10);
  selectedFilter = signal<FilterOrdenTab>('TODAS');

  // Readings Table — solo para tipo TOMA_LECTURA
  readings = signal<IReadingRowItem[]>([]);
  isLoadingReadings = signal(false);
  totalReadings = signal(0);
  currentReadingPage = signal(1);
  pageSizeReadings = signal(10);
  openDropdownId = signal<string | null>(null);
  selectedReadingForDetail = signal<IReading | null>(null);
  selectedReadingForEdit = signal<IReading | null>(null);

  // Modal Novedad de Orden de Trabajo
  selectedOrdenForNovedad = signal<OrderWork | null>(null);
  novedadObservacionText = '';

  // Processing state
  isChangingStatus = signal(false);
  processingOrdenId = signal<string | null>(null);

  // Result observation modal
  selectedOrdenForResult = signal<OrderWork | null>(null);

  readonly isLecturaRoute = computed(() => this.readingRoute()?.tipoRuta === 'TOMA_LECTURA');

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/Contratos/RutasDeLectura']);
      return;
    }

    this.routeId = Number(idParam);
    this.loadCatalogs();
    this.loadRouteDetail();
  }

  loadCatalogs(): void {
    this.comunidadesService.getAllComunidades(1, 100).subscribe({
      next: (res) => {
        this.comunidades = res.data;
      },
    });

    this.usersService.getUsers(1, 100).subscribe({
      next: (res) => {
        this.operarios = res.data.filter((u) => {
          const roleName = u.rol?.nombre?.toLowerCase() || '';
          return roleName.includes('operador') || roleName.includes('operario');
        });
      },
    });

    this.periodsService.getPeriods().subscribe({
      next: (res) => {
        this.periodos = res;
      },
    });
  }

  getComunidadNombre(comunidadId?: number): string {
    return resolveComunidadNombre(this.comunidades, comunidadId);
  }

  getOperarioNombre(operarioId?: number): string {
    return resolveOperarioNombre(this.operarios, operarioId);
  }

  getPeriodoNombre(periodoId?: number | null): string {
    if (!periodoId) return '—';
    const p = this.periodos.find((item) => item.periodoId === periodoId);
    return p?.nombre || `Período #${periodoId}`;
  }

  loadRouteDetail(): void {
    this.isLoadingRoute.set(true);

    this.routesService.getRouteById(this.routeId).subscribe({
      next: (data) => {
        this.readingRoute.set(data);
        this.isLoadingRoute.set(false);
        // Bifurcar según tipo de ruta
        if (this.isLecturaRoute()) {
          this.loadReadings();
        } else {
          this.loadOrdenes();
        }
      },
      error: () => {
        this.isLoadingRoute.set(false);
        this.toastService.error('No se pudo cargar la información de la ruta');
      },
    });
  }

  // --- KPI metrics para órdenes (solo rutas no-Lectura) ---
  get kpiTotal(): number {
    return this.routeKpis()?.total ?? 0;
  }

  get kpiCompletadas(): number {
    return this.routeKpis()?.completadas ?? 0;
  }

  get kpiPendientes(): number {
    return this.routeKpis()?.pendientes ?? 0;
  }

  get kpiConNovedad(): number {
    return this.routeKpis()?.conNovedad ?? 0;
  }

  get kpiProgresoPorcentaje(): number {
    const total = this.kpiTotal;
    if (total === 0) return 0;
    return Math.round((this.kpiCompletadas / total) * 100);
  }

  loadOrdenes(): void {
    this.isLoadingOrdenes.set(true);

    const estadoFilter = ESTADO_FILTER_MAP[this.selectedFilter()];

    this.routesService
      .getOrdenesByRuta(this.routeId, {
        estado: estadoFilter,
        page: this.currentPage(),
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.ordenes.set(res.data);
          this.totalOrdenes.set(res.meta?.totalItems ?? res.meta?.total ?? res.data.length);
          this.routeKpis.set(res.kpis ?? null);
          this.isLoadingOrdenes.set(false);
        },
        error: () => {
          this.ordenes.set([]);
          this.totalOrdenes.set(0);
          this.routeKpis.set(null);
          this.isLoadingOrdenes.set(false);
        },
      });
  }

  /** Carga lecturas para rutas de tipo TOMA_LECTURA */
  loadReadings(): void {
    this.isLoadingReadings.set(true);
    this.routesService
      .getReadingsByRuta(this.routeId, {
        page: this.currentReadingPage(),
        limit: this.pageSizeReadings(),
      })
      .subscribe({
        next: (res) => {
          const routeEstado = this.readingRoute()?.estado;
          const rows = res.data.map((r) => mapReadingForRouteToRow(r, routeEstado));
          this.readings.set(rows);
          this.totalReadings.set(res.meta?.totalItems ?? res.data.length);
          this.routeKpis.set(mapLecturaKpisToRouteKpis(res.kpis));
          this.isLoadingReadings.set(false);
        },
        error: () => {
          this.readings.set([]);
          this.totalReadings.set(0);
          this.routeKpis.set(null);
          this.isLoadingReadings.set(false);
        },
      });
  }

  onFilterChange(tab: FilterOrdenTab): void {
    this.selectedFilter.set(tab);
    this.currentPage.set(1);
    this.loadOrdenes();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadOrdenes();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadOrdenes();
  }

  // --- Badge / label helpers (now backed by typed constants) ---

  getOrdenEstadoCssClass(estado: EstadoOrden | string): string {
    return ESTADO_ORDEN_BADGE[estado as EstadoOrden] ?? ESTADO_ORDEN_FALLBACK_BADGE;
  }

  getOrdenTipoCssClass(tipo: TipoActividad | string): string {
    return TIPO_ACTIVIDAD_BADGE[tipo as TipoActividad] ?? TIPO_ACTIVIDAD_FALLBACK_BADGE;
  }

  getTipoActividadLabel(tipo: TipoActividad | string): string {
    return TIPO_ACTIVIDAD_LABEL[tipo as TipoActividad] ?? String(tipo);
  }

  getTipoLabel(tipo?: string): string {
    if (!tipo) return '—';
    return TIPO_RUTA_LABEL[tipo as TipoRuta] ?? tipo.replace(/_/g, ' ');
  }

  /**
   * Format completadoEn to dd/MM/yyyy (date only).
   * The backend emits a `YYYY-MM-DDT00:00:00` string for date-only fields to
   * avoid UTC-midnight shifts; we strip the time component here so the UI
   * shows just the date. If the input ever carries a meaningful time, switch
   * the return format to `dd/MM/yyyy HH:mm`.
   */
  formatCompletadoEn(isoString?: string): string {
    if (!isoString) return '—';
    const datePart = isoString.split('T')[0];
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!match) return '—';
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // --- Order actions (delegated to RouteOrderActionsService) ---

  iniciarOrden(orden: OrderWork): void {
    this.orderActions.start(orden, this.processingOrdenId, this.ordenes);
  }

  marcarCompletada(orden: OrderWork): void {
    this.orderActions.complete(orden, this.processingOrdenId, this.ordenes);
  }

  reportarNovedad(orden: OrderWork): void {
    this.selectedOrdenForNovedad.set(orden);
    this.novedadObservacionText = '';
  }

  closeNovedadModal(): void {
    this.selectedOrdenForNovedad.set(null);
    this.novedadObservacionText = '';
  }

  confirmarReportarNovedad(): void {
    const orden = this.selectedOrdenForNovedad();
    if (!orden) return;
    this.orderActions.reportNovedad(
      orden,
      this.novedadObservacionText,
      this.processingOrdenId,
      this.ordenes,
    );
    if (this.novedadObservacionText.trim()) {
      this.closeNovedadModal();
    }
  }

  verResultado(orden: OrderWork): void {
    this.selectedOrdenForResult.set(orden);
  }

  closeResultado(): void {
    this.selectedOrdenForResult.set(null);
  }

  // Route status transitions (delegated to RouteStatusService)
  async updateRouteStatus(nuevoEstado: RouteEstado): Promise<void> {
    const kpis = this.routeKpis();
    const pendingOrders = this.ordenes().filter(
      (o) => o.estado === 'PENDIENTE' || o.estado === 'EN_PROGRESO',
    ).length;
    await this.routeStatus.update(nuevoEstado, {
      route: this.readingRoute,
      isChangingStatus: this.isChangingStatus,
      isLecturaRoute: this.isLecturaRoute(),
      routeKpis: kpis,
      pendingOrders,
    });
  }

  onReadingPageChange(page: number): void {
    this.currentReadingPage.set(page);
    this.loadReadings();
  }

  onReadingPageSizeChange(size: number): void {
    this.pageSizeReadings.set(size);
    this.currentReadingPage.set(1);
    this.loadReadings();
  }

  // --- Reading actions ---

  onToggleReadingDropdown(event: { id: string; event: MouseEvent }): void {
    if (this.openDropdownId() === event.id) {
      this.openDropdownId.set(null);
    } else {
      this.openDropdownId.set(event.id);
    }
  }

  onCloseReadingDetail(): void {
    this.selectedReadingForDetail.set(null);
  }

  onViewLecturaDetail(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    this.readingsService.getReadingById(String(reading.lecturaId)).subscribe({
      next: (full) => {
        this.selectedReadingForDetail.set(full);
      },
      error: () => {
        this.selectedReadingForDetail.set(
          buildReadingFallback(reading, this.readingRoute()?.estado),
        );
      },
    });
  }

  onEditLectura(reading: ReadingSource): void {
    if (this.readingRoute()?.estado !== 'EN_PROGRESO') return;
    this.openDropdownId.set(null);
    this.selectedReadingForDetail.set(null);
    this.readingsService.getReadingById(String(reading.lecturaId)).subscribe({
      next: (full) => {
        this.selectedReadingForEdit.set(full);
      },
      error: () => this.toastService.error('No se pudo obtener la información de la lectura'),
    });
  }

  onEditLecturaFromDetail(reading: IReading): void {
    if (this.readingRoute()?.estado !== 'EN_PROGRESO') return;
    this.selectedReadingForDetail.set(null);
    this.selectedReadingForEdit.set(reading);
  }

  closeFormModal(): void {
    this.selectedReadingForEdit.set(null);
  }

  onReadingSaved(): void {
    this.closeFormModal();
    this.loadReadings();
  }

  onApproveLectura(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    this.readingActions.approve(reading, this.readings);
  }

  onRejectLectura(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    this.readingActions.reject(reading, this.readings);
  }

  onReportAnomalyLectura(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    this.router.navigate(['/app/Contratos/AnomaliasDeLectura'], {
      queryParams: {
        lecturaId: reading.lecturaId,
        report: 'true',
      },
    });
  }

  onRequestReLectura(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    this.readingActions.requestReReading(reading);
  }

  // ── Generación de Hoja de Campo Oficial (SC-236 Backend Stream) ───────
  async exportFieldSheetPdf(): Promise<void> {
    const route = this.readingRoute();
    if (!route) return;

    this.isExportingPdf.set(true);

    try {
      const blob = await firstValueFrom(this.routesService.getFieldSheetPdf(route.rutaId));
      this.blobDownloadService.download(
        blob,
        `Hoja_Campo_Ruta_${route.rutaId}_${route.tipoRuta}_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      this.toastService.success('Hoja de campo oficial generada exitosamente');
    } catch (err) {
      console.error('Error al exportar PDF oficial:', err);
      this.toastService.error('Ocurrió un error al generar la hoja de campo');
    } finally {
      this.isExportingPdf.set(false);
    }
  }
}
