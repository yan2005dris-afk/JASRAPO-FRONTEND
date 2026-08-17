import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingRoutesService } from './services/reading-routes.service';
import {
  IFindAllRoutesParams,
  IReadingRoute,
  TipoRuta,
} from './interfaces/ireading-route.interface';
import { ComunidadesService } from '../../admin/comunidades/services/comunidades.service';
import { UsersService } from '../../users/services/users.service';
import { Comunidad } from '../../admin/comunidades/models/comunidad.interface';
import { User } from '../../users/models/user.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Router } from '@angular/router';
import { RouteFormModalComponent } from './components/route-form-modal/route-form-modal.component';
import { ReassignRouteModalComponent } from './components/reassign-route-modal/reassign-route-modal.component';
import { RouteDetailModalComponent } from './components/route-detail-modal/route-detail-modal.component';

@Component({
  selector: 'app-reading-routes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    PaginationComponent,
    RouteFormModalComponent,
    ReassignRouteModalComponent,
    RouteDetailModalComponent,
  ],
  templateUrl: './reading-routes.html',
  styleUrl: './reading-routes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ReadingRoutesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // List State
  routes: IReadingRoute[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: string | number | null = null;

  // Catalogs
  operarios: User[] = [];
  comunidades: Comunidad[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  filterEstado = '';
  filterOperarioId: number | null = null;
  filterComunidadId: number | null = null;

  // Modals
  isFormModalOpen = false;
  selectedRouteForEdit: IReadingRoute | null = null;
  selectedRouteForReassign: IReadingRoute | null = null;
  selectedRouteForDetail: IReadingRoute | null = null;
  detailModalInitialTab: 'info' | 'readings' = 'info';

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadRoutes();
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
  }

  getOperarioNombre(operarioId: number): string {
    const user = this.operarios.find((u) => u.usuarioId === operarioId);
    if (user) {
      return `${user.nombres} ${user.apellidos}`.trim();
    }
    return `Operario #${operarioId}`;
  }

  getComunidadNombre(comunidadId: number): string {
    const com = this.comunidades.find((c) => c.id === comunidadId);
    if (com) {
      return com.nombre;
    }
    return `Comunidad #${comunidadId}`;
  }

  loadRoutes(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IFindAllRoutesParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.filterEstado) {
      params.estado = this.filterEstado;
    }
    if (this.filterOperarioId) {
      params.operarioId = this.filterOperarioId;
    }
    if (this.filterComunidadId) {
      params.comunidadId = this.filterComunidadId;
    }

    this.routesService.getRoutes(params).subscribe({
      next: (res) => {
        this.routes = res.data;
        this.totalItems = res.meta?.totalItems ?? res.data.length;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.routes = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
    });
  }

  limpiarFiltros(): void {
    this.filterEstado = '';
    this.filterOperarioId = null;
    this.filterComunidadId = null;
    this.currentPage = 1;
    this.loadRoutes();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRoutes();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadRoutes();
  }

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

  getTipoLabel(tipo: TipoRuta | string): string {
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

  // Modals Actions
  openCreateModal(): void {
    this.selectedRouteForDetail = null;
    this.selectedRouteForReassign = null;
    this.selectedRouteForEdit = null;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditModal(route: IReadingRoute): void {
    this.openDropdownId = null;
    this.selectedRouteForDetail = null;
    this.selectedRouteForReassign = null;
    this.selectedRouteForEdit = route;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  closeFormModal(): void {
    this.isFormModalOpen = false;
    this.selectedRouteForEdit = null;
    this.cdr.markForCheck();
  }

  onRouteSaved(): void {
    this.isFormModalOpen = false;
    this.selectedRouteForEdit = null;
    this.selectedRouteForDetail = null;
    this.selectedRouteForReassign = null;
    this.loadRoutes();
  }

  openReassignModal(route: IReadingRoute): void {
    this.openDropdownId = null;
    this.isFormModalOpen = false;
    this.selectedRouteForDetail = null;
    this.selectedRouteForReassign = route;
    this.cdr.markForCheck();
  }

  closeReassignModal(): void {
    this.selectedRouteForReassign = null;
    this.cdr.markForCheck();
  }

  onRouteReassigned(): void {
    this.selectedRouteForReassign = null;
    if (this.selectedRouteForDetail) {
      this.selectedRouteForDetail = null;
    }
    this.loadRoutes();
  }

  openDetailModal(route: IReadingRoute, tab: 'info' | 'readings' = 'info'): void {
    this.openDropdownId = null;
    this.router.navigate(['/app/Contratos/RutasDeLectura', route.rutaId]);
  }

  closeDetailModal(): void {
    this.selectedRouteForDetail = null;
    this.cdr.markForCheck();
  }

  deleteRoute(route: IReadingRoute): void {
    this.openDropdownId = null;
    this.dialogService
      .confirm({
        title: '¿Eliminar ruta de lectura?',
        message: `¿Estás seguro de que deseas eliminar la ruta "${route.nombre}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.routesService.deleteRoute(route.rutaId).subscribe({
            next: () => {
              this.toastService.show('Ruta eliminada correctamente', 'success');
              this.loadRoutes();
            },
            error: (err) => {
              this.toastService.show(
                err.error?.message || 'Error al eliminar la ruta',
                'error',
              );
            },
          });
        }
      });
  }

  changeRouteStatus(route: IReadingRoute, nuevoEstado: 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA' | 'PENDIENTE'): void {
    this.openDropdownId = null;
    this.routesService.updateRoute(route.rutaId, { estado: nuevoEstado } as any).subscribe({
      next: (updated) => {
        route.estado = updated.estado;
        if (this.selectedRouteForDetail && this.selectedRouteForDetail.rutaId === route.rutaId) {
          this.selectedRouteForDetail = { ...this.selectedRouteForDetail, estado: updated.estado };
        }
        const msg =
          nuevoEstado === 'EN_PROGRESO'
            ? 'Ruta iniciada y liberada a campo'
            : nuevoEstado === 'COMPLETADA'
              ? 'Ruta marcada como completada'
              : 'Estado de la ruta actualizado';
        this.toastService.show(msg, 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toastService.show(
          err.error?.message || 'No se pudo cambiar el estado de la ruta',
          'error',
        );
      },
    });
  }
}
