import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReadingRoutesService } from '../../services/reading-routes.service';
import {
  IReadingRoute,
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
import { ReadingsTableComponent, IReadingRowItem } from '../../../readings/components/readings-table/readings-table.component';

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
    DatePipe,
    ReadingsTableComponent,
  ],
  templateUrl: './reading-route-detail.component.html',
  styleUrl: './reading-route-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingRouteDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  routeId!: number;
  readingRoute = signal<IReadingRoute | null>(null);
  isLoadingRoute = signal(true);

  // Catalogs
  comunidades: Comunidad[] = [];
  operarios: User[] = [];
  periodos: { periodoId: number; nombre?: string; estado: string }[] = [];

  // Ordenes Table — solo para tipos INSTALACION/RECONEXION/INSPECCION
  ordenes = signal<OrderWork[]>([]);
  isLoadingOrdenes = signal(false);
  totalOrdenes = signal(0);
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

    this.routesService.getPeriods().subscribe({
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
    return this.totalOrdenes();
  }

  get kpiCompletadas(): number {
    return this.ordenes().filter((o) => o.estado === 'COMPLETADA').length;
  }

  get kpiPendientes(): number {
    return this.ordenes().filter((o) => o.estado === 'PENDIENTE' || o.estado === 'EN_PROGRESO')
      .length;
  }

  get kpiConNovedad(): number {
    return this.ordenes().filter((o) => o.estado === 'FALLIDA' || !!o.resultadoObservacion).length;
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
          this.isLoadingOrdenes.set(false);
        },
        error: () => {
          this.ordenes.set([]);
          this.totalOrdenes.set(0);
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
          }));
          this.readings.set(rows);
          this.totalReadings.set(res.meta?.totalItems ?? res.data.length);
          this.isLoadingReadings.set(false);
        },
        error: () => {
          this.readings.set([]);
          this.totalReadings.set(0);
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
   * Format completadoEn ISO string to dd/MM/yyyy HH:mm
   */
  formatCompletadoEn(isoString?: string): string {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
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
      error: () => {
        this.processingOrdenId.set(null);
        this.toastService.error('Error al iniciar la orden');
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

  // Report novelty (FALLIDA with resultadoObservacion)
  reportarNovedad(orden: OrderWork): void {
    const observacion = window.prompt(
      `Reportar novedad para orden #${orden.ordenVisita}\n\nIngresá la observación (motivo de la novedad):`,
    );
    if (!observacion || !observacion.trim()) return;

    this.processingOrdenId.set(orden.ordenTrabajoId);

    this.routesService
      .updateOrdenEstado(orden.ordenTrabajoId, 'FALLIDA', observacion.trim())
      .subscribe({
        next: () => {
          this.ordenes.update((list) =>
            list.map((o) =>
              o.ordenTrabajoId === orden.ordenTrabajoId
                ? { ...o, estado: 'FALLIDA' as const, resultadoObservacion: observacion.trim() }
                : o,
            ),
          );
          this.processingOrdenId.set(null);
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
    nuevoEstado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA',
  ): Promise<void> {
    const route = this.readingRoute();
    if (!route) return;

    if (nuevoEstado === 'COMPLETADA') {
      const pendientes = this.ordenes().filter(
        (o) => o.estado === 'PENDIENTE' || o.estado === 'EN_PROGRESO',
      );
      if (pendientes.length > 0) {
        const confirmed = await new Promise<boolean>((resolve) => {
          this.dialogService
            .confirm({
              title: 'Ruta con órdenes pendientes',
              message: `Esta ruta tiene ${pendientes.length} órdenes pendientes. ¿Deseas completarla de todas formas?`,
              confirmText: 'Sí, completar',
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
            this.toastService.success(`Ruta actualizada a ${nuevoEstado}`);
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

  onViewLecturaDetail(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    this.toastService.info(`Ver detalle de lectura #${reading.lecturaId}`);
    // TODO: abrir modal de detalle de lectura
  }

  onEditLectura(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    const nuevaLectura = window.prompt(
      `Registrar lectura para medidor ${reading.medidorSerie ?? reading.lecturaId}\n\nIngresá el valor de lectura actual:`,
    );
    if (!nuevaLectura) return;
    const valor = parseFloat(nuevaLectura);
    if (isNaN(valor) || valor < 0) {
      this.toastService.error('Valor de lectura inválido');
      return;
    }
    // TODO: implementar registro de lectura (PATCH con lecturaActual)
    this.toastService.info('Registro de lectura aún no conectado al backend');
  }

  onApproveLectura(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    this.routesService.updateReadingStatus(reading.lecturaId, 'APROBADA').subscribe({
      next: () => {
        this.readings.update((list) =>
          list.map((r) =>
            r.lecturaId === reading.lecturaId ? { ...r, estado: 'APROBADA' } : r,
          ),
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
            r.lecturaId === reading.lecturaId
              ? { ...r, estado: 'RECHAZADA_VERIFICACION' }
              : r,
          ),
        );
        this.toastService.warning('Lectura rechazada');
      },
      error: () => this.toastService.error('Error al rechazar la lectura'),
    });
  }

  onReportAnomalyLectura(reading: IReadingRowItem): void {
    this.openDropdownId.set(null);
    const observacion = window.prompt(
      `Reportar anomalía para lectura #${reading.lecturaId}\n\nIngresá la descripción de la anomalía:`,
    );
    if (!observacion?.trim()) return;
    this.routesService.updateReadingStatus(reading.lecturaId, 'CON_NOVEDAD').subscribe({
      next: () => {
        this.readings.update((list) =>
          list.map((r) =>
            r.lecturaId === reading.lecturaId ? { ...r, estado: 'CON_NOVEDAD' } : r,
          ),
        );
        this.toastService.warning('Anomalía reportada');
      },
      error: () => this.toastService.error('Error al reportar anomalía'),
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
}
