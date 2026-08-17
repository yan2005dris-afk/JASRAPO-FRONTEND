import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RubrosService } from './services/rubros.service';
import {
  IRubro,
  IRubroFilterParams,
  ITarifaImpuesto,
  TipoRubro,
} from './interfaces/irubro.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { RubroFormModalComponent } from './components/rubro-form-modal/rubro-form-modal.component';

@Component({
  selector: 'app-rubros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    RubroFormModalComponent,
  ],
  templateUrl: './rubros.component.html',
  styleUrl: './rubros.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class RubrosComponent implements OnInit {
  private readonly rubrosService = inject(RubrosService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // List State
  rubros: IRubro[] = [];
  tarifasImpuesto: ITarifaImpuesto[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: number | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  filterNombre = '';
  filterTipo: TipoRubro | '' = '';
  filterTarifa: number | '' = '';
  filterActivo = 'todos';
  filterGeneracion = 'todos';

  // Modals
  isFormModalOpen = false;
  selectedRubroForEdit: IRubro | null = null;

  readonly tipoOptions: { value: TipoRubro; label: string }[] = [
    { value: 'FIJO', label: 'Fijo (Cargo Fijo / Tasa)' },
    { value: 'VARIABLE', label: 'Variable (Consumo m³)' },
    { value: 'MULTA', label: 'Multa / Recargo' },
    { value: 'BIEN', label: 'Bien / Material' },
    { value: 'SERVICIO', label: 'Servicio / Instalación' },
    { value: 'OTRO', label: 'Otro' },
  ];

  ngOnInit(): void {
    this.loadTarifasImpuesto();
    this.loadRubros();
  }

  private loadTarifasImpuesto(): void {
    this.rubrosService.getTarifasImpuesto().subscribe({
      next: (list) => {
        this.tarifasImpuesto = list;
        this.cdr.markForCheck();
      },
      error: () => {
        this.tarifasImpuesto = [];
        this.cdr.markForCheck();
      },
    });
  }

  loadRubros(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IRubroFilterParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.filterNombre.trim()) {
      params.nombre = this.filterNombre.trim();
    }
    if (this.filterTipo) {
      params.tipoRubro = this.filterTipo;
    }
    if (this.filterTarifa !== '') {
      params.tarifaImpuestoId = Number(this.filterTarifa);
    }
    if (this.filterActivo === 'activos') {
      params.activo = true;
    } else if (this.filterActivo === 'inactivos') {
      params.activo = false;
    }
    if (this.filterGeneracion === 'automatico') {
      params.esAutomatico = true;
    } else if (this.filterGeneracion === 'manual') {
      params.esAutomatico = false;
    }

    this.rubrosService.getRubros(params).subscribe({
      next: (res) => {
        this.rubros = res.data;
        this.totalItems = res.meta?.total ?? res.data.length;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.rubros = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
    });
  }

  limpiarFiltros(): void {
    this.filterNombre = '';
    this.filterTipo = '';
    this.filterTarifa = '';
    this.filterActivo = 'todos';
    this.filterGeneracion = 'todos';
    this.currentPage = 1;
    this.loadRubros();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRubros();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadRubros();
  }

  toggleDropdown(id: number, event: MouseEvent): void {
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

  getTipoLabel(tipo: string): string {
    const found = this.tipoOptions.find((t) => t.value === tipo);
    return found ? found.label : tipo;
  }

  getTipoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'VARIABLE':
        return 'badge-soft-primary';
      case 'FIJO':
        return 'badge-soft-info';
      case 'MULTA':
        return 'badge-soft-danger';
      case 'SERVICIO':
        return 'badge-soft-warning';
      case 'BIEN':
        return 'badge-soft-success';
      default:
        return 'badge-soft-secondary';
    }
  }

  // Modal Actions
  openCreateModal(): void {
    this.selectedRubroForEdit = null;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditModal(rubro: IRubro): void {
    this.openDropdownId = null;
    this.selectedRubroForEdit = rubro;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  closeFormModal(): void {
    this.isFormModalOpen = false;
    this.selectedRubroForEdit = null;
    this.cdr.markForCheck();
  }

  onRubroSaved(): void {
    this.isFormModalOpen = false;
    this.selectedRubroForEdit = null;
    this.loadRubros();
  }

  toggleRubroStatus(rubro: IRubro): void {
    this.openDropdownId = null;
    const newStatus = !rubro.activo;
    const actionText = newStatus ? 'activar' : 'desactivar';

    this.dialogService
      .confirm({
        title: `${newStatus ? 'Activar' : 'Desactivar'} Rubro`,
        message: `¿Estás seguro de ${actionText} el rubro "${rubro.nombre}"?`,
        confirmText: newStatus ? 'Activar' : 'Desactivar',
        cancelText: 'Cancelar',
        isDanger: !newStatus,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading = true;
          this.rubrosService.updateRubro(rubro.rubroId, { activo: newStatus }).subscribe({
            next: () => {
              this.isLoading = false;
              this.toastService.show(`Rubro ${newStatus ? 'activado' : 'desactivado'} exitosamente`, 'success');
              this.loadRubros();
            },
            error: (err) => {
              this.isLoading = false;
              const msg = err?.error?.message || `Error al ${actionText} el rubro`;
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
              this.cdr.markForCheck();
            },
          });
        }
      });
  }

  deleteRubro(rubro: IRubro): void {
    this.openDropdownId = null;
    this.dialogService
      .confirm({
        title: 'Eliminar Rubro',
        message: `¿Estás seguro de eliminar permanentemente el rubro "${rubro.nombre}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading = true;
          this.rubrosService.deleteRubro(rubro.rubroId).subscribe({
            next: () => {
              this.isLoading = false;
              this.toastService.show('Rubro eliminado exitosamente', 'success');
              this.loadRubros();
            },
            error: (err) => {
              this.isLoading = false;
              const msg = err?.error?.message || 'Error al eliminar el rubro';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
              this.cdr.markForCheck();
            },
          });
        }
      });
  }
}
