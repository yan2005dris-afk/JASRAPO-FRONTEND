import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
import { TableExportService } from '../../../shared/services/table-export.service';
import {
  DropdownComponent,
  DropdownItem,
} from '../../../shared/components/dropdown/dropdown.component';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Router } from '@angular/router';
import { ReassignRouteModalComponent } from './components/reassign-route-modal/reassign-route-modal.component';
import { TIPO_RUTA_LABEL } from './domain/constants/route-detail.constants';
import { resolveComunidadNombre, resolveOperarioNombre } from '../../../shared/utils/operator-name';
import { filterOperariosByRole } from '../../../shared/utils/users';
import { ExportColumn } from '../../../shared/services/table-export.service';

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
    ReassignRouteModalComponent,
    DropdownComponent,
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
  private readonly tableExportService = inject(TableExportService);

  readonly exportItems: DropdownItem[] = [
    { label: 'Exportar a PDF', action: 'pdf', icon: 'bi bi-file-earmark-pdf-fill text-danger' },
    {
      label: 'Exportar a Excel (.xls)',
      action: 'excel',
      icon: 'bi bi-file-earmark-excel-fill text-success',
    },
    { label: 'Exportar a CSV', action: 'csv', icon: 'bi bi-file-earmark-text-fill text-primary' },
  ];

  handleExportAction(action: string): void {
    if (action === 'pdf') this.exportToPdf();
    else if (action === 'excel') this.exportToExcel();
    else if (action === 'csv') this.exportToCsv();
  }

  // List state (signals so OnPush detects mutations automatically)
  readonly routes = signal<IReadingRoute[]>([]);
  readonly totalItems = signal(0);
  readonly isLoading = signal(false);
  readonly hasFetched = signal(false);
  readonly openDropdownId = signal<string | number | null>(null);

  // Catalogs
  readonly operarios = signal<User[]>([]);
  readonly comunidades = signal<Comunidad[]>([]);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  // Filters
  readonly filterEstado = signal('');
  readonly filterOperarioId = signal<number | null>(null);
  readonly filterComunidadId = signal<number | null>(null);

  // Modals
  readonly selectedRouteForReassign = signal<IReadingRoute | null>(null);

  /** Columns shared by the PDF / Excel / CSV exports. */
  private buildExportColumns(): ExportColumn<IReadingRoute>[] {
    return [
      { header: 'ID', key: 'rutaId', width: 35, align: 'center' },
      { header: 'Nombre de Ruta', key: 'nombre', width: 110 },
      {
        header: 'Tipo',
        transform: (r) => r.tipoRuta.replace(/_/g, ' '),
        width: 70,
      },
      {
        header: 'Comunidad',
        transform: (r) => this.getComunidadNombre(r.comunidadId),
        width: 90,
      },
      {
        header: 'Operario',
        transform: (r) => this.getOperarioNombre(r.operarioId),
        width: 100,
      },
      {
        header: 'Fecha Planificada',
        transform: (r) =>
          r.fechaPlanificada ? new Date(r.fechaPlanificada).toLocaleDateString('es-EC') : '—',
        width: 65,
        align: 'center',
      },
      { header: 'Estado', key: 'estado', width: 60, align: 'center' },
    ];
  }

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadRoutes();
  }

  loadCatalogs(): void {
    this.comunidadesService.getAllComunidades(1, 100).subscribe({
      next: (res) => this.comunidades.set(res.data),
    });

    this.usersService.getUsers(1, 100).subscribe({
      next: (res) => this.operarios.set(filterOperariosByRole(res.data)),
    });
  }

  getOperarioNombre(operarioId: number | null | undefined): string {
    return resolveOperarioNombre(this.operarios(), operarioId);
  }

  getComunidadNombre(comunidadId: number | null | undefined): string {
    return resolveComunidadNombre(this.comunidades(), comunidadId);
  }

  loadRoutes(): void {
    this.isLoading.set(true);
    this.openDropdownId.set(null);

    const params: IFindAllRoutesParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    if (this.filterEstado()) {
      params.estado = this.filterEstado();
    }
    if (this.filterOperarioId()) {
      params.operarioId = this.filterOperarioId()!;
    }
    if (this.filterComunidadId()) {
      params.comunidadId = this.filterComunidadId()!;
    }

    this.routesService.getRoutes(params).subscribe({
      next: (res) => {
        this.routes.set(res.data);
        this.totalItems.set(res.meta?.totalItems ?? res.data.length);
        this.isLoading.set(false);
        this.hasFetched.set(true);
      },
      error: () => {
        this.routes.set([]);
        this.totalItems.set(0);
        this.isLoading.set(false);
        this.hasFetched.set(true);
      },
    });
  }

  limpiarFiltros(): void {
    this.filterEstado.set('');
    this.filterOperarioId.set(null);
    this.filterComunidadId.set(null);
    this.currentPage.set(1);
    this.loadRoutes();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadRoutes();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadRoutes();
  }

  toggleDropdown(id: string | number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.set(this.openDropdownId() === id ? null : id);
  }

  closeDropdowns(): void {
    if (this.openDropdownId() !== null) {
      this.openDropdownId.set(null);
    }
  }

  getTipoLabel(tipo: TipoRuta | string | undefined): string {
    if (!tipo) return '—';
    return TIPO_RUTA_LABEL[tipo as TipoRuta] ?? String(tipo).replace(/_/g, ' ');
  }

  goToAssignment(): void {
    this.router.navigate(['/app/Contratos/RutasDeLectura/asignar']);
  }

  openReassignModal(route: IReadingRoute): void {
    this.openDropdownId.set(null);
    this.selectedRouteForReassign.set(route);
  }

  closeReassignModal(): void {
    this.selectedRouteForReassign.set(null);
  }

  onRouteReassigned(): void {
    this.selectedRouteForReassign.set(null);
    this.loadRoutes();
  }

  openDetailModal(route: IReadingRoute): void {
    this.openDropdownId.set(null);
    this.router.navigate(['/app/Contratos/RutasDeLectura', route.rutaId]);
  }

  deleteRoute(route: IReadingRoute): void {
    this.openDropdownId.set(null);
    this.dialogService
      .confirm({
        title: '¿Eliminar ruta de trabajo?',
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
              this.toastService.show(err.error?.message || 'Error al eliminar la ruta', 'error');
            },
          });
        }
      });
  }

  changeRouteStatus(
    route: IReadingRoute,
    nuevoEstado: 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA' | 'PENDIENTE',
  ): void {
    this.openDropdownId.set(null);

    if (nuevoEstado === 'EN_PROGRESO' && !route.operarioId) {
      this.toastService.show(
        'No se puede iniciar la ruta: debe asignar un operario responsable primero.',
        'error',
      );
      return;
    }

    this.routesService.updateRoute(route.rutaId, { estado: nuevoEstado }).subscribe({
      next: (updated) => {
        this.routes.update((list) =>
          list.map((r) => (r.rutaId === route.rutaId ? { ...r, ...updated } : r)),
        );
        const msg =
          nuevoEstado === 'EN_PROGRESO'
            ? 'Ruta iniciada y liberada a campo'
            : nuevoEstado === 'COMPLETADA'
              ? 'Ruta marcada como completada'
              : 'Estado de la ruta actualizado';
        this.toastService.show(msg, 'success');
      },
      error: (err) => {
        this.toastService.show(
          err.error?.message || 'No se pudo cambiar el estado de la ruta',
          'error',
        );
      },
    });
  }

  // ---------- Exports (PDF, Excel, CSV) ----------
  private baseExportOptions(title: string) {
    return {
      title,
      fileName: `Rutas_Trabajo_${new Date().toISOString().slice(0, 10)}`,
      data: this.routes() as unknown as Record<string, unknown>[],
      summary: `Total de rutas: ${this.routes().length}`,
    };
  }

  exportToPdf(): void {
    if (this.routes().length === 0) return;
    this.tableExportService.exportToPdf({
      ...this.baseExportOptions('LISTADO DE RUTAS DE TRABAJO'),
      columns: this.buildExportColumns() as unknown as ExportColumn<Record<string, unknown>>[],
    });
  }

  private stripWidthAndAlign(
    columns: ExportColumn<IReadingRoute>[],
  ): ExportColumn<Record<string, unknown>>[] {
    return columns.map((c) => {
      void c.width;
      void c.align;
      const { width, align, ...rest } = c;
      void width;
      void align;
      return { ...rest } as unknown as ExportColumn<Record<string, unknown>>;
    });
  }

  exportToExcel(): void {
    if (this.routes().length === 0) return;
    this.tableExportService.exportToExcel({
      ...this.baseExportOptions('LISTADO DE RUTAS DE TRABAJO'),
      columns: this.stripWidthAndAlign(this.buildExportColumns()),
    });
  }

  exportToCsv(): void {
    if (this.routes().length === 0) return;
    this.tableExportService.exportToCsv({
      title: 'LISTADO DE RUTAS DE TRABAJO',
      fileName: `Rutas_Trabajo_${new Date().toISOString().slice(0, 10)}`,
      columns: this.stripWidthAndAlign(this.buildExportColumns()),
      data: this.routes() as unknown as Record<string, unknown>[],
    });
  }
}
