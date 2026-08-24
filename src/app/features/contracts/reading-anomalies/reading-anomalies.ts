import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReadingAnomaliesService } from './services/reading-anomalies.service';
import {
  IReadingAnomaly,
  IReadingAnomalyFilterParams,
  TipoAnomalia,
} from './interfaces/ianomaly.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { TableExportService } from '../../../shared/services/table-export.service';
import {
  DropdownComponent,
  DropdownItem,
} from '../../../shared/components/dropdown/dropdown.component';
import { AnomalyFormModalComponent } from './components/anomaly-form-modal/anomaly-form-modal.component';
import { AnomalyResolveModalComponent } from './components/anomaly-resolve-modal/anomaly-resolve-modal.component';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';

@Component({
  selector: 'app-reading-anomalies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    TableSkeletonComponent,
    AnomalyFormModalComponent,
    AnomalyResolveModalComponent,
    LocalDatePipe,
    DropdownComponent,
  ],
  templateUrl: './reading-anomalies.html',
  styleUrl: './reading-anomalies.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ReadingAnomaliesComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly anomaliesService = inject(ReadingAnomaliesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

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

  // List State
  anomalies: IReadingAnomaly[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Workqueue Filter (default: PENDIENTE)
  activeStatusFilter = 'PENDIENTE';
  searchTerm = '';
  filterLecturaId = '';
  filterTipo = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Modals
  isFormModalOpen = false;
  selectedAnomalyForEdit: IReadingAnomaly | null = null;
  initialLecturaIdForModal: string | null = null;
  selectedAnomalyForResolve: IReadingAnomaly | null = null;

  readonly tipoOptions: { value: TipoAnomalia; label: string }[] = [
    { value: 'FUGA', label: 'Fuga de Agua' },
    { value: 'MEDIDOR_DAÑADO', label: 'Medidor Dañado' },
    { value: 'LECTURA_ERRONEA', label: 'Lectura Errónea' },
    { value: 'OTRO', label: 'Otro' },
  ];

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['report'] === 'true' && params['lecturaId']) {
        this.initialLecturaIdForModal = String(params['lecturaId']);
        this.isFormModalOpen = true;
        // Limpiar query params de la URL para que no filtren la tabla general
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });
      } else if (params['lecturaId']) {
        this.filterLecturaId = String(params['lecturaId']);
      }
      this.loadAnomalies();
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.searchAnomalies();
    }, 400);
  }

  onFilterTipoChange(tipo: string): void {
    this.filterTipo = tipo;
    this.searchAnomalies();
  }

  searchAnomalies(): void {
    this.currentPage = 1;
    this.loadAnomalies();
  }

  loadAnomalies(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IReadingAnomalyFilterParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    if (this.activeStatusFilter) {
      params.estado = this.activeStatusFilter;
    }
    if (this.filterLecturaId.trim()) {
      params.lecturaId = this.filterLecturaId.trim();
    }
    if (this.filterTipo) {
      params.tipo = this.filterTipo;
    }

    this.anomaliesService.getAnomalies(params).subscribe({
      next: (res) => {
        this.anomalies = res.data;
        this.totalItems = res.meta?.totalItems ?? res.data.length;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.anomalies = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
    });
  }

  setStatusFilter(status: string): void {
    this.activeStatusFilter = status;
    this.currentPage = 1;
    this.loadAnomalies();
  }

  limpiarFiltros(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.activeStatusFilter = 'PENDIENTE';
    this.searchTerm = '';
    this.filterLecturaId = '';
    this.filterTipo = '';
    this.currentPage = 1;
    this.loadAnomalies();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadAnomalies();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadAnomalies();
  }

  toggleDropdown(id: string, event: MouseEvent): void {
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

  getTipoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'FUGA':
        return 'badge-soft-danger';
      case 'MEDIDOR_DAÑADO':
        return 'badge-soft-warning';
      case 'LECTURA_ERRONEA':
        return 'badge-soft-info';
      default:
        return 'badge-soft-secondary';
    }
  }

  getTipoLabel(tipo: string): string {
    const found = this.tipoOptions.find((t) => t.value === tipo);
    return found ? found.label : tipo.replace(/_/g, ' ');
  }

  // Modals Actions
  openCreateModal(): void {
    this.selectedAnomalyForEdit = null;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditModal(anomaly: IReadingAnomaly): void {
    this.openDropdownId = null;
    this.selectedAnomalyForEdit = anomaly;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  closeFormModal(): void {
    this.isFormModalOpen = false;
    this.selectedAnomalyForEdit = null;
    this.cdr.markForCheck();
  }

  onAnomalySaved(): void {
    this.isFormModalOpen = false;
    this.selectedAnomalyForEdit = null;
    this.loadAnomalies();
  }

  openResolveModal(anomaly: IReadingAnomaly): void {
    this.openDropdownId = null;
    this.anomaliesService.getAnomalyById(anomaly.anomaliaId).subscribe({
      next: (full) => {
        this.selectedAnomalyForResolve = full;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedAnomalyForResolve = anomaly;
        this.cdr.markForCheck();
      },
    });
  }

  closeResolveModal(): void {
    this.selectedAnomalyForResolve = null;
    this.cdr.markForCheck();
  }

  onAnomalyResolved(): void {
    this.selectedAnomalyForResolve = null;
    this.loadAnomalies();
  }

  deleteAnomaly(anomaly: IReadingAnomaly): void {
    this.openDropdownId = null;
    this.dialogService
      .confirm({
        title: 'Eliminar Anomalía',
        message: `¿Estás seguro de eliminar el registro de anomalía #${anomaly.anomaliaId}?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading = true;
          this.anomaliesService.deleteAnomaly(anomaly.anomaliaId).subscribe({
            next: () => {
              this.isLoading = false;
              this.toastService.show('Anomalía eliminada exitosamente', 'success');
              this.loadAnomalies();
            },
            error: (err) => {
              this.isLoading = false;
              const msg = err?.error?.message || 'Error al eliminar anomalía';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
              this.cdr.markForCheck();
            },
          });
        }
      });
  }

  // ---------- Exportaciones de Bandeja de Anomalías (PDF, Excel, CSV) ----------
  private readonly tableExportService = inject(TableExportService);

  exportToPdf(): void {
    if (this.anomalies.length === 0) return;

    this.tableExportService.exportToPdf({
      title: 'BANDEJA DE ANOMALÍAS DE LECTURA',
      fileName: `Anomalias_Lectura_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'ID', key: 'anomaliaId', width: 40, align: 'center' },
        {
          header: 'Lectura ID',
          transform: (a) => (a as unknown as IReadingAnomaly).lecturaId ?? '—',
          width: 60,
          align: 'center',
        },
        {
          header: 'Tipo Anomalía',
          transform: (a) => (a as unknown as IReadingAnomaly).tipo?.replace(/_/g, ' ') ?? '—',
          width: 100,
        },
        {
          header: 'Fecha Lectura',
          transform: (a) => {
            const f = (a as unknown as IReadingAnomaly).lectura?.fecha;
            return f ? new Date(f).toLocaleDateString('es-EC') : '—';
          },
          width: 70,
          align: 'center',
        },
        {
          header: 'Lectura Actual',
          transform: (a) => {
            const l = (a as unknown as IReadingAnomaly).lectura?.lecturaActual;
            return l != null ? String(l) : '—';
          },
          width: 70,
          align: 'center',
        },
        {
          header: 'Observación',
          transform: (a) => (a as unknown as IReadingAnomaly).observacion || '—',
          width: 120,
        },
        { header: 'Estado', key: 'estado', width: 60, align: 'center' },
      ],
      data: this.anomalies as unknown as Record<string, unknown>[],
      summary: `Total incidentes registrados: ${this.anomalies.length}`,
    });
  }

  exportToExcel(): void {
    if (this.anomalies.length === 0) return;

    this.tableExportService.exportToExcel({
      title: 'BANDEJA DE ANOMALÍAS DE LECTURA',
      fileName: `Anomalias_Lectura_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'ID', key: 'anomaliaId' },
        { header: 'Lectura ID', key: 'lecturaId' },
        {
          header: 'Tipo Anomalía',
          transform: (a) => (a as unknown as IReadingAnomaly).tipo?.replace(/_/g, ' ') ?? '—',
        },
        {
          header: 'Fecha Lectura',
          transform: (a) => {
            const f = (a as unknown as IReadingAnomaly).lectura?.fecha;
            return f ? new Date(f).toLocaleDateString('es-EC') : '—';
          },
        },
        {
          header: 'Lectura Actual',
          transform: (a) => (a as unknown as IReadingAnomaly).lectura?.lecturaActual ?? '—',
        },
        { header: 'Observación', key: 'observacion' },
        { header: 'Estado', key: 'estado' },
      ],
      data: this.anomalies as unknown as Record<string, unknown>[],
      summary: `Total anomalías: ${this.anomalies.length}`,
    });
  }

  exportToCsv(): void {
    if (this.anomalies.length === 0) return;

    this.tableExportService.exportToCsv({
      title: 'BANDEJA DE ANOMALÍAS DE LECTURA',
      fileName: `Anomalias_Lectura_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'ID', key: 'anomaliaId' },
        { header: 'Lectura ID', key: 'lecturaId' },
        {
          header: 'Tipo Anomalía',
          transform: (a) => (a as unknown as IReadingAnomaly).tipo?.replace(/_/g, ' ') ?? '—',
        },
        {
          header: 'Fecha Lectura',
          transform: (a) => {
            const f = (a as unknown as IReadingAnomaly).lectura?.fecha;
            return f ? new Date(f).toLocaleDateString('es-EC') : '—';
          },
        },
        {
          header: 'Lectura Actual',
          transform: (a) => (a as unknown as IReadingAnomaly).lectura?.lecturaActual ?? '—',
        },
        { header: 'Observación', key: 'observacion' },
        { header: 'Estado', key: 'estado' },
      ],
      data: this.anomalies as unknown as Record<string, unknown>[],
    });
  }
}
