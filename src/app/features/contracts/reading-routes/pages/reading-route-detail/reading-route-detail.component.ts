import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { ReadingRoutesService } from '../../services/reading-routes.service';
import { LocalDatePipe } from '../../../../../shared/pipes/local-date.pipe';
import { TableExportService } from '../../../../../shared/services/table-export.service';
import {
  IReadingRoute,
  IRouteKpis,
  OrderWork,
  EstadoOrden,
  TipoActividad,
} from '../../interfaces/ireading-route.interface';
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
  private readonly tableExportService = inject(TableExportService);
  private readonly cdr = inject(ChangeDetectorRef);

  routeId!: number;
  readingRoute = signal<IReadingRoute | null>(null);
  isLoadingRoute = signal(true);
  isExportingPdf = signal(false);

  // Catalogs
  comunidades: Comunidad[] = [];
  operarios: User[] = [];
  periodos: { periodoId: number; nombre?: string; estado: string }[] = [];

  // Ordenes Table — solo para tipos INSTALACION/RECONEXION/INSPECCION
  ordenes = signal<OrderWork[]>([]);
  isLoadingOrdenes = signal(false);
  totalOrdenes = signal(0);
  // KPIs agregados del backend (sobre el set completo filtrado, no la página).
  // Lo setea tanto loadOrdenes() como loadReadings() según el tipo de ruta.
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
  isFormModalOpen = signal(false);

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
        this.cdr.markForCheck();
      },
    });

    this.usersService.getUsers(1, 100).subscribe({
      next: (res) => {
        this.operarios = res.data.filter((u) => {
          const roleName = u.rol?.nombre?.toLowerCase() || '';
          return roleName.includes('operador') || roleName.includes('operario');
        });
        this.cdr.markForCheck();
      },
    });

    this.periodsService.getPeriods().subscribe({
      next: (res) => {
        this.periodos = res;
        this.cdr.markForCheck();
      },
    });
  }

  getComunidadNombre(comunidadId?: number): string {
    if (!comunidadId) return '—';
    const com = this.comunidades.find((c) => c.id === comunidadId);
    return com ? com.nombre : `Comunidad #${comunidadId}`;
  }

  getOperarioNombre(operarioId?: number): string {
    if (!operarioId) return 'Sin asignar';
    const op = this.operarios.find((u) => u.usuarioId === operarioId);
    return op ? `${op.nombres} ${op.apellidos}`.trim() : `Operario #${operarioId}`;
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

    let estadoFilter: string | undefined;
    switch (this.selectedFilter()) {
      case 'PENDIENTES':
        estadoFilter = 'PENDIENTE,EN_PROGRESO';
        break;
      case 'COMPLETADAS':
        estadoFilter = 'COMPLETADA';
        break;
      case 'NOVEDAD':
        estadoFilter = 'FALLIDA';
        break;
      default:
        estadoFilter = undefined;
    }

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
          // Transformar IReadingForRoute → IReadingRowItem (mapea estadoLectura → estado)
          const rows: IReadingRowItem[] = res.data.map((r) => ({
            lecturaId: r.lecturaId,
            guia: r.guia,
            clienteNombre: r.clienteNombre,
            direccion: r.direccion,
            sector: r.sector,
            medidorSerie: r.medidorSerie,
            lecturaAnterior: r.lecturaAnterior,
            lecturaActual: r.lecturaActual,
            consumoCalculado: r.consumoCalculado,
            estado: r.estadoLectura ?? 'PENDIENTE',
            routeEstado: this.readingRoute()?.estado,
          }));
          this.readings.set(rows);
          this.totalReadings.set(res.meta?.totalItems ?? res.data.length);
          // Mapear kpis de lecturas (aprobadas/rechazadas) al shape unificado
          // que consumen los getters (completadas/canceladas).
          const k = res.kpis;
          this.routeKpis.set(
            k
              ? {
                  total: k.total,
                  completadas: k.aprobadas ?? 0,
                  pendientes: k.pendientes ?? 0,
                  conNovedad: k.conNovedad ?? 0,
                  canceladas: k.rechazadas ?? 0,
                }
              : null,
          );
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

  // --- Actions ---

  /**
   * Returns the CSS class for the estado badge.
   */
  getOrdenEstadoCssClass(estado: EstadoOrden | string): string {
    switch (estado) {
      case 'COMPLETADA':
        return 'bg-success';
      case 'EN_PROGRESO':
        return 'bg-warning text-dark';
      case 'PENDIENTE':
        return 'bg-secondary';
      case 'FALLIDA':
      case 'CANCELADA':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * Returns the CSS class for the tipoActividad badge.
   */
  getOrdenTipoCssClass(tipo: TipoActividad | string): string {
    switch (tipo) {
      case 'LECTURA':
        return 'bg-primary';
      case 'INSTALACION':
        return 'bg-success';
      case 'RECONEXION':
        return 'bg-warning text-dark';
      case 'INSPECCION':
        return 'bg-purple';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * Returns human label for tipoActividad.
   */
  getTipoActividadLabel(tipo: TipoActividad | string): string {
    switch (tipo) {
      case 'LECTURA':
        return 'Lectura';
      case 'INSTALACION':
        return 'Instalación';
      case 'RECONEXION':
        return 'Reconexión';
      case 'INSPECCION':
        return 'Inspección';
      default:
        return String(tipo);
    }
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
    // The backend already sends a date-only ISO string (T00:00:00 local).
    // Split on 'T' to avoid the UTC-midnight shift that `new Date('YYYY-MM-DD')`
    // would introduce in negative-UTC-offset zones.
    const datePart = isoString.split('T')[0];
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!match) return '—';
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // Start orden (PENDIENTE -> EN_PROGRESO)
  iniciarOrden(orden: OrderWork): void {
    this.processingOrdenId.set(orden.ordenTrabajoId);

    this.routesService.updateOrdenEstado(orden.ordenTrabajoId, 'EN_PROGRESO').subscribe({
      next: () => {
        this.ordenes.update((list) =>
          list.map((o) =>
            o.ordenTrabajoId === orden.ordenTrabajoId
              ? { ...o, estado: 'EN_PROGRESO' as const }
              : o,
          ),
        );
        this.processingOrdenId.set(null);
        this.toastService.success('Orden iniciada');
      },
      error: (err) => {
        this.processingOrdenId.set(null);
        const message = err?.error?.message;
        this.toastService.error(
          Array.isArray(message)
            ? message.join(', ')
            : message ||
                'No puedes iniciar esta operación porque no estás asignado como operario a esta orden de trabajo.',
        );
      },
    });
  }

  // Mark orden as completed
  marcarCompletada(orden: OrderWork): void {
    this.dialogService
      .confirm({
        title: 'Marcar como completada',
        message: `¿Deseas marcar como completada la orden #${orden.ordenVisita} para el contrato ${orden.contrato.numeroContrato}?`,
        confirmText: 'Sí, completar',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.processingOrdenId.set(orden.ordenTrabajoId);

        this.routesService.updateOrdenEstado(orden.ordenTrabajoId, 'COMPLETADA').subscribe({
          next: () => {
            this.ordenes.update((list) =>
              list.map((o) =>
                o.ordenTrabajoId === orden.ordenTrabajoId
                  ? { ...o, estado: 'COMPLETADA' as const, completadoEn: new Date().toISOString() }
                  : o,
              ),
            );
            this.processingOrdenId.set(null);
            this.toastService.success('Orden marcada como completada');
          },
          error: () => {
            this.processingOrdenId.set(null);
            this.toastService.error('Error al completar la orden');
          },
        });
      });
  }

  // Open modal to report novelty (FALLIDA with resultadoObservacion)
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
    const observacion = this.novedadObservacionText.trim();
    if (!orden || !observacion) return;

    this.processingOrdenId.set(orden.ordenTrabajoId);

    this.routesService.updateOrdenEstado(orden.ordenTrabajoId, 'FALLIDA', observacion).subscribe({
      next: () => {
        this.ordenes.update((list) =>
          list.map((o) =>
            o.ordenTrabajoId === orden.ordenTrabajoId
              ? { ...o, estado: 'FALLIDA' as const, resultadoObservacion: observacion }
              : o,
          ),
        );
        this.processingOrdenId.set(null);
        this.closeNovedadModal();
        this.toastService.warning('Novedad reportada para la orden');
      },
      error: () => {
        this.processingOrdenId.set(null);
        this.toastService.error('Error al reportar la novedad');
      },
    });
  }

  // View result observation inline
  verResultado(orden: OrderWork): void {
    this.selectedOrdenForResult.set(orden);
  }

  closeResultado(): void {
    this.selectedOrdenForResult.set(null);
  }

  // Route status transitions
  async updateRouteStatus(
    nuevoEstado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'PARCIAL' | 'CANCELADA',
  ): Promise<void> {
    const route = this.readingRoute();
    if (!route) return;

    if (nuevoEstado === 'COMPLETADA') {
      const noAprobadas = this.isLecturaRoute()
        ? (this.routeKpis()?.total ?? 0) - (this.routeKpis()?.completadas ?? 0)
        : this.ordenes().filter((o) => o.estado === 'PENDIENTE' || o.estado === 'EN_PROGRESO')
            .length;

      if (noAprobadas > 0) {
        const message = this.isLecturaRoute()
          ? `Atención: Existen ${noAprobadas} lecturas pendientes o en revisión. La ruta quedará marcada como PARCIAL. ¿Desea continuar?`
          : `Esta ruta tiene ${noAprobadas} órdenes pendientes. ¿Deseas completarla de todas formas?`;
        const confirmed = await new Promise<boolean>((resolve) => {
          this.dialogService
            .confirm({
              title: this.isLecturaRoute()
                ? 'Ruta con lecturas pendientes'
                : 'Ruta con órdenes pendientes',
              message,
              confirmText: 'Sí, continuar',
              cancelText: 'Cancelar',
              isDanger: true,
            })
            .subscribe((c) => resolve(c));
        });
        if (!confirmed) return;
      }
    }

    this.dialogService
      .confirm({
        title: 'Cambiar estado de ruta',
        message: `¿Estás seguro de cambiar el estado de la ruta a "${nuevoEstado}"?`,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        isDanger: nuevoEstado === 'CANCELADA',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.isChangingStatus.set(true);

        this.routesService.updateRoute(route.rutaId, { estado: nuevoEstado }).subscribe({
          next: (updated) => {
            this.readingRoute.set({ ...route, ...updated });
            this.isChangingStatus.set(false);
            this.toastService.success(`Ruta actualizada a ${updated.estado ?? nuevoEstado}`);
          },
          error: () => {
            this.isChangingStatus.set(false);
            this.toastService.error('No se pudo actualizar el estado de la ruta');
          },
        });
      });
  }

  getTipoLabel(tipo?: string): string {
    if (!tipo) return '—';
    switch (tipo) {
      case 'TOMA_LECTURA':
        return 'Toma de Lectura';
      case 'RECONEXION':
        return 'Reconexión';
      case 'INSTALACION':
        return 'Instalación';
      case 'INSPECCION':
        return 'Inspección';
      default:
        return String(tipo).replace(/_/g, ' ');
    }
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

  // --- Reading Actions ---

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
        this.cdr.markForCheck();
      },
      error: () => {
        // Fallback básico con los datos de la fila
        const detail: IReading = {
          lecturaId: String(reading.lecturaId),
          fecha: (reading.fecha as string | Date) ?? new Date().toISOString(),
          lecturaAnterior: reading.lecturaAnterior ?? 0,
          lecturaActual: reading.lecturaActual ?? 0,
          consumoCalculado: reading.consumoCalculado ?? 0,
          contratoId: String(reading.contratoId ?? ''),
          descripcionAnomalia: null,
          fechaValidacion: null,
          isValidada: false,
          lecturaInicial: false,
          periodoId: 0,
          tieneAnomalia: reading.tieneAnomalia ?? false,
          estado: reading.estado,
          routeEstado: this.readingRoute()?.estado,
          contrato: reading.clienteNombre
            ? {
                contratoId: String(reading.contratoId ?? ''),
                numeroGuia: reading.guia ?? '',
                direccionSuministro: reading.direccion ?? '',
                estado: '',
                cliente: {
                  clienteId: '',
                  nombres: reading.clienteNombre ?? '',
                  apellidos: '',
                  identificacion: '',
                },
                sector: reading.sector ? { nombre: reading.sector } : null,
              }
            : null,
          medidor: reading.medidorSerie
            ? { medidorId: '', serie: reading.medidorSerie, marca: '', modelo: '' }
            : null,
          periodoRel: null,
        };
        this.selectedReadingForDetail.set(detail);
        this.cdr.markForCheck();
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
        this.isFormModalOpen.set(true);
        this.cdr.markForCheck();
      },
      error: () => this.toastService.error('No se pudo obtener la información de la lectura'),
    });
  }

  onEditLecturaFromDetail(reading: IReading): void {
    if (this.readingRoute()?.estado !== 'EN_PROGRESO') return;
    this.selectedReadingForDetail.set(null);
    this.selectedReadingForEdit.set(reading);
    this.isFormModalOpen.set(true);
    this.cdr.markForCheck();
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.selectedReadingForEdit.set(null);
    this.cdr.markForCheck();
  }

  onReadingSaved(): void {
    this.closeFormModal();
    this.loadReadings();
  }

  onApproveLectura(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    this.routesService.updateReadingStatus(reading.lecturaId, 'APROBADA').subscribe({
      next: () => {
        this.readings.update((list) =>
          list.map((r) => (r.lecturaId === reading.lecturaId ? { ...r, estado: 'APROBADA' } : r)),
        );
        this.toastService.success('Lectura aprobada');
      },
      error: () => this.toastService.error('Error al aprobar la lectura'),
    });
  }

  onRejectLectura(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    this.routesService.updateReadingStatus(reading.lecturaId, 'RECHAZADA_VERIFICACION').subscribe({
      next: () => {
        this.readings.update((list) =>
          list.map((r) =>
            r.lecturaId === reading.lecturaId ? { ...r, estado: 'RECHAZADA_VERIFICACION' } : r,
          ),
        );
        this.toastService.warning('Lectura rechazada');
      },
      error: () => this.toastService.error('Error al rechazar la lectura'),
    });
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
    this.dialogService
      .confirm({
        title: 'Solicitar relectura',
        message: `¿Solicitar relectura para el medidor ${reading.medidorSerie ?? reading.lecturaId}?`,
        confirmText: 'Sí, solicitar',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        // TODO: implementar relectura
        this.toastService.info('Solicitud de relectura aún no conectada al backend');
      });
  }

  // ── Generación de Hoja de Campo Oficial (SC-236 Backend Stream) ───────
  async exportFieldSheetPdf(): Promise<void> {
    const route = this.readingRoute();
    if (!route) return;

    this.isExportingPdf.set(true);

    try {
      const blob = await firstValueFrom(this.routesService.getFieldSheetPdf(route.rutaId));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Hoja_Campo_Ruta_${route.rutaId}_${route.tipoRuta}_${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.toastService.success('Hoja de campo oficial generada exitosamente');
    } catch (err) {
      console.error('Error al exportar PDF oficial:', err);
      this.toastService.error('Ocurrió un error al generar la hoja de campo');
    } finally {
      this.isExportingPdf.set(false);
      this.cdr.markForCheck();
    }
  }
}
