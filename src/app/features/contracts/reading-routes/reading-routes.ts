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
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
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
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // List State
  routes: IReadingRoute[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: string | number | null = null;

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

  ngOnInit(): void {
    this.loadRoutes();
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
    this.selectedRouteForEdit = null;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditModal(route: IReadingRoute): void {
    this.openDropdownId = null;
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
    if (this.selectedRouteForDetail) {
      this.selectedRouteForDetail = null;
    }
    this.loadRoutes();
  }

  openReassignModal(route: IReadingRoute): void {
    this.openDropdownId = null;
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

  openDetailModal(route: IReadingRoute): void {
    this.openDropdownId = null;
    this.routesService.getRouteById(route.rutaId).subscribe({
      next: (full) => {
        this.selectedRouteForDetail = full;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedRouteForDetail = route;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetailModal(): void {
    this.selectedRouteForDetail = null;
    this.cdr.markForCheck();
  }

  deleteRoute(route: IReadingRoute): void {
    this.openDropdownId = null;
    this.dialogService
      .confirm({
        title: 'Eliminar Ruta de Trabajo',
        message: `¿Estás seguro de eliminar la ruta "${route.nombre}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading = true;
          this.routesService.deleteRoute(route.rutaId).subscribe({
            next: () => {
              this.isLoading = false;
              this.toastService.show('Ruta eliminada exitosamente', 'success');
              this.loadRoutes();
            },
            error: (err) => {
              this.isLoading = false;
              const msg = err?.error?.message || 'Error al eliminar ruta';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
              this.cdr.markForCheck();
            },
          });
        }
      });
  }
}
