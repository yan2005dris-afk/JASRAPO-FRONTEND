import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
  output,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { TariffsService } from './services/tariffs.service';
import { ITariffCategory } from './interfaces/itariff.interface';
import { TariffsFormComponent } from './components/tariffs-form/tariffs-form.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-tariffs',
  imports: [CommonModule, TariffsFormComponent, PaginationComponent],
  templateUrl: './tariffs.html',
  styleUrl: './tariffs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class TariffsComponent implements OnInit {
  private readonly tariffsService = inject(TariffsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  // Modo selección: cuando es true, la pantalla se usa como selector (sin editar/eliminar).
  readonly selectionMode = input(false);
  readonly tariffSelected = output<ITariffCategory>();

  /** Emite la tarifa elegida (solo en modo selección). */
  selectTariff(tariff: ITariffCategory): void {
    if (this.selectionMode()) {
      this.tariffSelected.emit(tariff);
    }
  }

  tariffs: ITariffCategory[] = [];
  isLoading = false;

  isModalOpen = false;
  selectedTariff: ITariffCategory | null = null;

  openDropdownId: number | null = null;
  // Paginación (client-side)
  pageSizeOptions = [5, 10, 15];
  pageSize = 5;
  currentPage = 1;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.tariffs.length / this.pageSize));
  }

  get pagedTariffs(): ITariffCategory[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.tariffs.slice(start, start + this.pageSize);
  }

  setPageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.loadTariffs();
  }

  loadTariffs(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.tariffsService.getTariffs().subscribe({
      next: (data) => {
        this.tariffs = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando tarifas:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
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

  openEditModal(tariff: ITariffCategory): void {
    this.selectedTariff = tariff;
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  deleteTariff(tariff: ITariffCategory): void {
    if (tariff.categoriaTarifaId === undefined) {
      return;
    }
    const id = tariff.categoriaTarifaId;

    this.confirmDialog
      .confirm({
        title: 'Eliminar tarifa',
        message: `¿Está seguro de eliminar la tarifa "${tariff.nombre}"?`,
        confirmText: 'Eliminar',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.tariffsService.deleteTariff(id).subscribe({
            next: () => {
              this.toast.success('Tarifa eliminada correctamente', 'Éxito');
              this.loadTariffs();
            },
            error: (err: HttpErrorResponse) => {
              this.toast.error(err.error?.message ?? 'No se pudo eliminar la tarifa.', 'Error');
            },
          });
        }
      });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedTariff = null;
    this.cdr.markForCheck();
  }

  onFormSubmitted(): void {
    this.closeModal();
    this.loadTariffs();
  }
}
