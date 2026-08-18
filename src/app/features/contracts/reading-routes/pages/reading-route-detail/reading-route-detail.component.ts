import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReadingRoutesService } from '../../services/reading-routes.service';
import {
  IReadingRoute,
  IReadingForRoute,
  TipoRuta,
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
import { AnomalyFormModalComponent } from '../../../reading-anomalies/components/anomaly-form-modal/anomaly-form-modal.component';

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
    AnomalyFormModalComponent,
  ],
  templateUrl: './reading-route-detail.component.html',
  styleUrl: './reading-route-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
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
  readingRoute: IReadingRoute | null = null;
  isLoadingRoute = true;

  // Catalogs
  comunidades: Comunidad[] = [];
  operarios: User[] = [];
  periodos: { periodoId: number; nombre?: string; estado: string }[] = [];

  // Readings Table
  readings: IReadingForRoute[] = [];
  isLoadingReadings = false;
  totalReadings = 0;
  currentPage = 1;
  pageSize = 10;
  searchQuery = '';

  // Processing state
  processingReadingId: string | number | null = null;
  isBulkApproving = false;
  isChangingStatus = false;

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
    this.isLoadingRoute = true;
    this.cdr.markForCheck();

    this.routesService.getRouteById(this.routeId).subscribe({
      next: (data) => {
        this.readingRoute = data;
        this.isLoadingRoute = false;
        this.cdr.markForCheck();
        this.loadReadings();
      },
      error: () => {
        this.isLoadingRoute = false;
        this.toastService.error('No se pudo cargar la información de la ruta');
        this.cdr.markForCheck();
      },
    });
  }

  // Progress metrics from backend KPIs
  totalApprovedReadings = 0;

  loadReadings(): void {
    if (!this.readingRoute?.comunidadId) return;

    this.isLoadingReadings = true;
    this.cdr.markForCheck();

    this.routesService
      .getEligibleReadings({
        comunidadId: this.readingRoute.comunidadId,
        sectorId: this.readingRoute.sectorId || undefined,
        periodoId: this.readingRoute.periodoId || undefined,
        fechaPlanificada: this.readingRoute.fechaPlanificada || undefined,
        tipoRuta: this.readingRoute.tipoRuta as any,
        search: this.searchQuery.trim() || undefined,
        page: this.currentPage,
        limit: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.readings = res.data;
          this.totalReadings = res.meta?.total ?? res.meta?.totalItems ?? res.data.length;
          if (res.kpis) {
            this.totalApprovedReadings = res.kpis.aprobadas ?? 0;
          }
          this.isLoadingReadings = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.readings = [];
          this.totalReadings = 0;
          this.totalApprovedReadings = 0;
          this.isLoadingReadings = false;
          this.cdr.markForCheck();
        },
      });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadReadings();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadReadings();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadReadings();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadReadings();
  }

  get pendingReviewCount(): number {
    return this.readings.filter(
      (r) => r.estadoLectura === 'PENDIENTE' || r.estadoLectura === 'POR_REVISION',
    ).length;
  }

  get approvedCount(): number {
    return this.totalApprovedReadings;
  }

  // Actions & Dropdown
  openDropdownId: string | number | null = null;
  isAnomalyModalOpen = false;
  selectedLecturaIdForAnomaly: string | null = null;

  toggleDropdown(id: string | number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === id ? null : id;
    this.cdr.markForCheck();
  }

  closeDropdowns(): void {
    if (this.openDropdownId !== null) {
      this.openDropdownId = null;
      this.cdr.markForCheck();
    }
  }

  openAnomalyModal(lectura: IReadingForRoute): void {
    this.openDropdownId = null;
    this.selectedLecturaIdForAnomaly = String(lectura.lecturaId);
    this.isAnomalyModalOpen = true;
    this.cdr.markForCheck();
  }

  closeAnomalyModal(): void {
    this.isAnomalyModalOpen = false;
    this.selectedLecturaIdForAnomaly = null;
    this.cdr.markForCheck();
  }

  onAnomalySaved(): void {
    this.isAnomalyModalOpen = false;
    this.selectedLecturaIdForAnomaly = null;
    this.loadReadings();
  }

  requestReReading(lectura: IReadingForRoute): void {
    this.openDropdownId = null;
    this.dialogService
      .confirm({
        title: 'Solicitar Relectura / Rechazo',
        message: `¿Rechazar la toma actual y solicitar relectura en campo para el contrato con Guía #${lectura.guia}?`,
        confirmText: 'Solicitar Relectura',
        cancelText: 'Cancelar',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.changeReadingStatus(lectura, 'RECHAZADA_VERIFICACION');
        }
      });
  }

  changeReadingStatus(
    lectura: IReadingForRoute,
    nuevoEstado: 'APROBADA' | 'CON_NOVEDAD' | 'RECHAZADA_VERIFICACION' | 'PENDIENTE',
  ): void {
    this.openDropdownId = null;
    this.processingReadingId = lectura.lecturaId;
    this.cdr.markForCheck();

    this.routesService.updateReadingStatus(lectura.lecturaId, nuevoEstado).subscribe({
      next: () => {
        lectura.estadoLectura = nuevoEstado;
        this.processingReadingId = null;
        this.toastService.success(
          nuevoEstado === 'APROBADA'
            ? 'Lectura aprobada'
            : nuevoEstado === 'RECHAZADA_VERIFICACION'
              ? 'Lectura rechazada: se ha solicitado relectura'
              : nuevoEstado === 'CON_NOVEDAD'
                ? 'Lectura marcada con novedad'
                : 'Lectura en pendiente',
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.processingReadingId = null;
        this.toastService.error('Error al actualizar el estado de la lectura');
        this.cdr.markForCheck();
      },
    });
  }

  async approveAllPending(): Promise<void> {
    const pendings = this.readings.filter(
      (r) => r.estadoLectura === 'PENDIENTE' || r.estadoLectura === 'POR_REVISION',
    );
    if (pendings.length === 0) return;

    this.dialogService
      .confirm({
        title: 'Aprobar todas las lecturas',
        message: `¿Deseas aprobar ${pendings.length} lecturas pendientes en esta página?`,
        confirmText: 'Sí, aprobar todas',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe(async (confirmed) => {
        if (!confirmed) return;

        this.isBulkApproving = true;
        this.cdr.markForCheck();

        let completed = 0;
        let errors = 0;

        for (const item of pendings) {
          try {
            await this.routesService.updateReadingStatus(item.lecturaId, 'APROBADA').toPromise();
            item.estadoLectura = 'APROBADA';
            completed++;
          } catch {
            errors++;
          }
        }

        this.isBulkApproving = false;
        if (errors === 0) {
          this.toastService.success(`Se aprobaron ${completed} lecturas correctamente`);
        } else {
          this.toastService.warning(`Se aprobaron ${completed} lecturas. Hubo ${errors} errores.`);
        }
        this.cdr.markForCheck();
      });
  }

  async updateRouteStatus(
    nuevoEstado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA',
  ): Promise<void> {
    if (!this.readingRoute) return;

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

        this.isChangingStatus = true;
        this.cdr.markForCheck();

        this.routesService
          .updateRoute(this.readingRoute!.rutaId, { estado: nuevoEstado as any })
          .subscribe({
            next: (updated) => {
              this.readingRoute = { ...this.readingRoute!, ...updated };
              this.isChangingStatus = false;
              this.toastService.success(`Ruta actualizada a ${nuevoEstado}`);
              this.cdr.markForCheck();
            },
            error: () => {
              this.isChangingStatus = false;
              this.toastService.error('No se pudo actualizar el estado de la ruta');
              this.cdr.markForCheck();
            },
          });
      });
  }

  getTipoLabel(tipo?: TipoRuta | string): string {
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
}
