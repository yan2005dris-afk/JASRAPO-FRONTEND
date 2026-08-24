import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
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

  // List State Signals
  readonly readings = signal<IReading[]>([]);
  readonly totalItems = signal(0);
  readonly isLoading = signal(false);
  readonly hasFetched = signal(false);
  readonly openDropdownId = signal<string | null>(null);

  // Pagination Signals
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  // Filters Signals
  readonly searchTerm = signal('');
  readonly selectedEstado = signal('TODOS');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Modals Signals
  readonly isFormModalOpen = signal(false);
  readonly selectedReadingForEdit = signal<IReading | null>(null);
  readonly selectedReadingForDetail = signal<IReading | null>(null);

  readonly tableReadings = computed<IReadingRowItem[]>(() => {
    return this.readings().map((r) => {
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
  });

  ngOnInit(): void {
    this.loadReadings();
  }

  loadReadings(): void {
    this.clearSearchTimer();
    this.isLoading.set(true);
    this.openDropdownId.set(null);

    const params: IReadingFilterParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    const estado = this.selectedEstado();
    if (estado && estado !== 'TODOS') {
      params.estado = estado;
    }

    const term = this.searchTerm().trim();
    if (term) {
      params.search = term;
    }

    this.readingsService.getReadings(params).subscribe({
      next: (res) => {
        this.readings.set(res.data);
        this.totalItems.set(res.meta?.total ?? res.meta?.totalItems ?? res.data.length);
        this.isLoading.set(false);
        this.hasFetched.set(true);
      },
      error: () => {
        this.readings.set([]);
        this.totalItems.set(0);
        this.isLoading.set(false);
        this.hasFetched.set(true);
      },
    });
  }

  onSearchTermChange(term: string): void {
    this.searchTerm.set(term);
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.loadReadings();
    }, 400);
  }

  onEstadoChange(estado: string): void {
    this.selectedEstado.set(estado);
    this.currentPage.set(1);
    this.loadReadings();
  }

  limpiarFiltros(): void {
    this.searchTerm.set('');
    this.selectedEstado.set('TODOS');
    this.currentPage.set(1);
    this.loadReadings();
  }

  ngOnDestroy(): void {
    this.clearSearchTimer();
  }

  private clearSearchTimer(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadReadings();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadReadings();
  }

  toggleDropdown(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update((current) => (current === id ? null : id));
  }

  closeDropdowns(): void {
    if (this.openDropdownId() !== null) {
      this.openDropdownId.set(null);
    }
  }

  // Modals Actions
  openCreateModal(): void {
    this.selectedReadingForEdit.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditModal(reading: IReadingRowItem | IReading): void {
    this.openDropdownId.set(null);
    const full =
      this.readings().find((r) => String(r.lecturaId) === String(reading.lecturaId)) ||
      (reading as IReading);
    this.selectedReadingForEdit.set(full);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.selectedReadingForEdit.set(null);
  }

  onReadingSaved(): void {
    this.isFormModalOpen.set(false);
    this.selectedReadingForEdit.set(null);
    if (this.selectedReadingForDetail()) {
      this.selectedReadingForDetail.set(null);
    }
    this.loadReadings();
  }

  openDetailModal(reading: IReadingRowItem | IReading): void {
    this.openDropdownId.set(null);
    this.readingsService.getReadingById(String(reading.lecturaId)).subscribe({
      next: (full) => {
        this.selectedReadingForDetail.set(full);
      },
      error: () => {
        const fallback =
          this.readings().find((r) => String(r.lecturaId) === String(reading.lecturaId)) ||
          (reading as IReading);
        this.selectedReadingForDetail.set(fallback);
      },
    });
  }

  closeDetailModal(): void {
    this.selectedReadingForDetail.set(null);
  }

  reportAnomaly(reading: IReadingRowItem | IReading): void {
    this.openDropdownId.set(null);
    this.router.navigate(['/app/Contratos/AnomaliasDeLectura'], {
      queryParams: {
        lecturaId: reading.lecturaId,
        report: 'true',
      },
    });
  }

  approveReading(reading: IReading): void {
    this.openDropdownId.set(null);
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
    this.openDropdownId.set(null);
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
          this.isLoading.set(true);
          this.readingsService.deleteReading(reading.lecturaId).subscribe({
            next: () => {
              this.isLoading.set(false);
              this.toastService.show('Lectura eliminada exitosamente', 'success');
              this.loadReadings();
            },
            error: (err) => {
              this.isLoading.set(false);
              const msg = err?.error?.message || 'Error al eliminar lectura';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
            },
          });
        }
      });
  }
}
