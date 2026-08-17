import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingsService } from './services/readings.service';
import {
  IReading,
  IReadingFilterParams,
} from './interfaces/ireading.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ContractPickerComponent } from '../../../shared/components/contract-picker/contract-picker.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ReadingFormModalComponent } from './components/reading-form-modal/reading-form-modal.component';
import { ReadingDetailModalComponent } from './components/reading-detail-modal/reading-detail-modal.component';
import type { IContract } from '../service-contracts/interfaces/icontract.interface';

@Component({
  selector: 'app-readings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    TableSkeletonComponent,
    ContractPickerComponent,
    ReadingFormModalComponent,
    ReadingDetailModalComponent,
  ],
  templateUrl: './readings.html',
  styleUrl: './readings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ReadingsComponent implements OnInit {
  private readonly readingsService = inject(ReadingsService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // List State
  readings: IReading[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  filterContratoId = '';
  selectedContractNumber = '';
  selectedContractName = '';
  isContractPickerOpen = false;

  // Modals
  isFormModalOpen = false;
  selectedReadingForEdit: IReading | null = null;
  selectedReadingForDetail: IReading | null = null;

  ngOnInit(): void {
    this.loadReadings();
  }

  loadReadings(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IReadingFilterParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.filterContratoId.trim()) {
      params.contratoId = this.filterContratoId.trim();
    }

    this.readingsService.getReadings(params).subscribe({
      next: (res) => {
        this.readings = res.data;
        this.totalItems = res.meta?.total ?? res.meta?.totalItems ?? res.data.length;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.readings = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
    });
  }

  abrirBuscadorContratos(): void {
    this.isContractPickerOpen = true;
  }

  cerrarBuscadorContratos(): void {
    this.isContractPickerOpen = false;
  }

  onContractSelected(contract: IContract): void {
    this.filterContratoId = contract.contratoId;
    this.selectedContractNumber = contract.numeroGuia ? `Guía: ${contract.numeroGuia}` : `Contrato #${contract.contratoId}`;
    this.selectedContractName = ContractPickerComponent.formatClientName(contract.cliente);
    this.isContractPickerOpen = false;
    this.currentPage = 1;
    this.loadReadings();
  }

  limpiarFiltros(): void {
    this.filterContratoId = '';
    this.selectedContractNumber = '';
    this.selectedContractName = '';
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

  // Modals Actions
  openCreateModal(): void {
    this.selectedReadingForEdit = null;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditModal(reading: IReading): void {
    this.openDropdownId = null;
    this.selectedReadingForEdit = reading;
    this.isFormModalOpen = true;
    this.cdr.markForCheck();
  }

  closeFormModal(): void {
    this.isFormModalOpen = false;
    this.selectedReadingForEdit = null;
    this.cdr.markForCheck();
  }

  onReadingSaved(): void {
    this.isFormModalOpen = false;
    this.selectedReadingForEdit = null;
    if (this.selectedReadingForDetail) {
      this.selectedReadingForDetail = null;
    }
    this.loadReadings();
  }

  openDetailModal(reading: IReading): void {
    this.openDropdownId = null;
    this.readingsService.getReadingById(reading.lecturaId).subscribe({
      next: (full) => {
        this.selectedReadingForDetail = full;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedReadingForDetail = reading;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetailModal(): void {
    this.selectedReadingForDetail = null;
    this.cdr.markForCheck();
  }

  deleteReading(reading: IReading): void {
    this.openDropdownId = null;
    this.dialogService
      .confirm({
        title: 'Eliminar Lectura',
        message: `¿Estás seguro de eliminar la lectura #${reading.lecturaId}?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading = true;
          this.readingsService.deleteReading(reading.lecturaId).subscribe({
            next: () => {
              this.isLoading = false;
              this.toastService.show('Lectura eliminada exitosamente', 'success');
              this.loadReadings();
            },
            error: (err) => {
              this.isLoading = false;
              const msg = err?.error?.message || 'Error al eliminar lectura';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
              this.cdr.markForCheck();
            },
          });
        }
      });
  }
}
