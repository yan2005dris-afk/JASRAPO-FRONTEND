import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiscountsService } from './services/discounts.service';
import { IDiscount, IDiscountFilterParams, TipoDescuento } from './interfaces/idiscount.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { DiscountFormModalComponent } from './components/discount-form-modal/discount-form-modal.component';
import { ApplyDiscountModalComponent } from './components/apply-discount-modal/apply-discount-modal.component';

@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    DiscountFormModalComponent,
    ApplyDiscountModalComponent,
  ],
  templateUrl: './discounts.html',
  styleUrl: './discounts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class DiscountsComponent implements OnInit {
  private readonly discountsService = inject(DiscountsService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // List State
  discounts: IDiscount[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: number | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  filterNombre = '';
  filterTipo: TipoDescuento | '' = '';
  filterActivo = 'todos';

  // Modals
  isFormModalOpen = false;
  selectedDiscountForEdit: IDiscount | null = null;
  selectedDiscountForApply: IDiscount | null = null;

  readonly tipoOptions: { value: TipoDescuento; label: string }[] = [
    { value: 'TERCERA_EDAD', label: 'Tercera Edad' },
    { value: 'DISCAPACIDAD', label: 'Discapacidad' },
    { value: 'INTERES_MORA', label: 'Interés por Mora' },
    { value: 'EXENCION_TASA', label: 'Exención de Tasa' },
    { value: 'CONVENIO', label: 'Convenio' },
    { value: 'OTROS', label: 'Otros' },
  ];

  ngOnInit(): void {
    this.loadDiscounts();
  }

  loadDiscounts(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IDiscountFilterParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.filterNombre.trim()) {
      params.nombre = this.filterNombre.trim();
    }
    if (this.filterTipo) {
      params.tipoDescuento = this.filterTipo;
    }
    if (this.filterActivo === 'activos') {
      params.activo = true;
    } else if (this.filterActivo === 'inactivos') {
      params.activo = false;
    }

    this.discountsService.getDiscounts(params).subscribe({
      next: (res) => {
        this.discounts = res.data;
        this.totalItems = res.meta?.totalItems ?? res.data.length;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.discounts = [];
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
    this.filterActivo = 'todos';
    this.currentPage = 1;
    this.loadDiscounts();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadDiscounts();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadDiscounts();
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
    return found ? found.label : tipo.replace(/_/g, ' ');
  }

  // Modal Actions
  openCreateModal(): void {
    this.selectedDiscountForEdit = null;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditModal(discount: IDiscount): void {
    this.openDropdownId = null;
    this.selectedDiscountForEdit = discount;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  closeFormModal(): void {
    this.isFormModalOpen = false;
    this.selectedDiscountForEdit = null;
    this.cdr.markForCheck();
  }

  onDiscountSaved(): void {
    this.isFormModalOpen = false;
    this.selectedDiscountForEdit = null;
    this.loadDiscounts();
  }

  openApplyModal(discount: IDiscount): void {
    this.openDropdownId = null;
    this.selectedDiscountForApply = discount;
    this.cdr.markForCheck();
  }

  closeApplyModal(): void {
    this.selectedDiscountForApply = null;
    this.cdr.markForCheck();
  }

  onDiscountApplied(): void {
    this.selectedDiscountForApply = null;
    this.loadDiscounts();
  }

  deleteDiscount(discount: IDiscount): void {
    this.openDropdownId = null;
    this.dialogService
      .confirm({
        title: 'Desactivar Descuento',
        message: `¿Estás seguro de desactivar el descuento "${discount.nombre}"?`,
        confirmText: 'Desactivar',
        cancelText: 'Cancelar',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading = true;
          this.discountsService.deleteDiscount(discount.id).subscribe({
            next: () => {
              this.isLoading = false;
              this.toastService.show('Descuento desactivado exitosamente', 'success');
              this.loadDiscounts();
            },
            error: (err) => {
              this.isLoading = false;
              const msg = err?.error?.message || 'Error al desactivar el descuento';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
              this.cdr.markForCheck();
            },
          });
        }
      });
  }
}
