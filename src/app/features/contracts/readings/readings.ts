import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReadingsService } from './services/readings.service';
import { IReading, IReadingFilterParams } from './interfaces/ireading.interface';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ReadingFormModalComponent } from './components/reading-form-modal/reading-form-modal.component';
import { ReadingDetailModalComponent } from './components/reading-detail-modal/reading-detail-modal.component';
import {
  ReadingsTableComponent,
  IReadingRowItem,
} from './components/readings-table/readings-table.component';

@Component({
  selector: 'app-readings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EmptyStateComponent,
    PaginationComponent,
    TableSkeletonComponent,
    ReadingFormModalComponent,
    ReadingDetailModalComponent,
    ReadingsTableComponent,
  ],
  templateUrl: './readings.html',
  styleUrl: './readings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ReadingsComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
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
  searchTerm = '';
  selectedEstado = 'TODOS';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Modals
  isFormModalOpen = false;
  selectedReadingForEdit: IReading | null = null;
  selectedReadingForDetail: IReading | null = null;

  ngOnInit(): void {
    this.loadReadings();
  }

  loadReadings(): void {
    this.clearSearchTimer();
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IReadingFilterParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.selectedEstado && this.selectedEstado !== 'TODOS') {
      params.estado = this.selectedEstado;
    }

    const term = this.searchTerm.trim();
    if (term) {
      params.search = term;
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

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadReadings();
    }, 400);
  }

  onEstadoChange(estado: string): void {
    this.selectedEstado = estado;
    this.currentPage = 1;
    this.loadReadings();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.selectedEstado = 'TODOS';
    this.currentPage = 1;
    this.loadReadings();
  }

  ngOnDestroy(): void {
    this.clearSearchTimer();
  }

  get tableReadings(): IReadingRowItem[] {
    return this.readings.map((r) => {
      const cliente = r.contrato?.cliente;
      const clienteNombre = cliente?.razonSocial?.trim()
        ? cliente.razonSocial.trim()
        : cliente
          ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim()
          : undefined;

      return {
        lecturaId: r.lecturaId,
        guia: r.contrato?.numeroGuia,
        contratoId: r.contratoId,
        clienteNombre: clienteNombre,
        direccion: r.contrato?.direccionSuministro,
        sector: r.contrato?.sector?.nombre,
        medidorSerie: r.medidor?.serie,
        fecha: r.fecha,
        lecturaAnterior: r.lecturaAnterior,
        lecturaActual: r.lecturaActual,
        consumoCalculado: r.consumoCalculado,
        estado: r.estado,
        tieneAnomalia: r.tieneAnomalia,
      };
    });
  }

  private clearSearchTimer(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
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

  openEditModal(reading: IReadingRowItem | IReading): void {
    this.openDropdownId = null;
    const full =
      this.readings.find((r) => String(r.lecturaId) === String(reading.lecturaId)) ||
      (reading as IReading);
    this.selectedReadingForEdit = full;
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

  openDetailModal(reading: IReadingRowItem | IReading): void {
    this.openDropdownId = null;
    this.readingsService.getReadingById(String(reading.lecturaId)).subscribe({
      next: (full) => {
        this.selectedReadingForDetail = full;
        this.cdr.markForCheck();
      },
      error: () => {
        const fallback =
          this.readings.find((r) => String(r.lecturaId) === String(reading.lecturaId)) ||
          (reading as IReading);
        this.selectedReadingForDetail = fallback;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetailModal(): void {
    this.selectedReadingForDetail = null;
    this.cdr.markForCheck();
  }

  reportAnomaly(reading: IReadingRowItem | IReading): void {
    this.openDropdownId = null;
    this.router.navigate(['/app/Contratos/AnomaliasDeLectura'], {
      queryParams: {
        lecturaId: reading.lecturaId,
        report: 'true',
      },
    });
  }

  approveReading(reading: IReading): void {
    this.openDropdownId = null;
    this.readingsService.updateReading(reading.lecturaId, { estado: 'APROBADA' }).subscribe({
      next: () => {
        this.toastService.show('Lectura aprobada exitosamente', 'success');
        this.loadReadings();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al aprobar la lectura';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
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
