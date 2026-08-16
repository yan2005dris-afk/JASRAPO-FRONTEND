import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingAnomaliesService } from './services/reading-anomalies.service';
import {
  IReadingAnomaly,
  IReadingAnomalyFilterParams,
  TipoAnomalia,
} from './interfaces/ianomaly.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { AnomalyFormModalComponent } from './components/anomaly-form-modal/anomaly-form-modal.component';
import { AnomalyResolveModalComponent } from './components/anomaly-resolve-modal/anomaly-resolve-modal.component';

@Component({
  selector: 'app-reading-anomalies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    AnomalyFormModalComponent,
    AnomalyResolveModalComponent,
  ],
  templateUrl: './reading-anomalies.html',
  styleUrl: './reading-anomalies.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ReadingAnomaliesComponent implements OnInit {
  private readonly anomaliesService = inject(ReadingAnomaliesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

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
  filterLecturaId = '';
  filterTipo = '';

  // Modals
  isFormModalOpen = false;
  selectedAnomalyForEdit: IReadingAnomaly | null = null;
  selectedAnomalyForResolve: IReadingAnomaly | null = null;

  readonly tipoOptions: { value: TipoAnomalia; label: string }[] = [
    { value: 'FUGA', label: 'Fuga de Agua' },
    { value: 'MEDIDOR_DAÑADO', label: 'Medidor Dañado' },
    { value: 'LECTURA_ERRONEA', label: 'Lectura Errónea' },
    { value: 'OTRO', label: 'Otro' },
  ];

  ngOnInit(): void {
    this.loadAnomalies();
  }

  loadAnomalies(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IReadingAnomalyFilterParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

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
    this.activeStatusFilter = 'PENDIENTE';
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
}
