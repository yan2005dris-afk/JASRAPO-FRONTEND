import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { TariffsService } from './services/tariffs.service';
import { ITariffCategory } from './interfaces/itariff.interface';
import { TariffsFormComponent } from './components/tariffs-form/tariffs-form.component';
import { RubroFormModalComponent } from '../../billing/rubros/components/rubro-form-modal/rubro-form-modal.component';
import { RubroTableComponent } from '../../billing/rubros/components/rubro-table/rubro-table.component';
import { RubrosService } from '../../billing/rubros/services/rubros.service';
import { IRubro, TipoRubro } from '../../billing/rubros/interfaces/irubro.interface';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-tariffs',
  imports: [
    CommonModule,
    FormsModule,
    TariffsFormComponent,
    RubroFormModalComponent,
    RubroTableComponent,
    PaginationComponent,
  ],
  templateUrl: './tariffs.component.html',
  styleUrl: './tariffs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class TariffsComponent implements OnInit {
  private readonly tariffsService = inject(TariffsService);
  private readonly rubrosService = inject(RubrosService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  // Modo selección
  readonly selectionMode = input(false);
  readonly tariffSelected = output<ITariffCategory>();

  selectTariff(tariff: ITariffCategory): void {
    if (this.selectionMode()) {
      this.tariffSelected.emit(tariff);
    }
  }

  // Estado con Signals
  readonly tariffs = signal<ITariffCategory[]>([]);
  readonly isLoading = signal(false);
  readonly searchNombre = signal('');
  readonly isModalOpen = signal(false);
  readonly selectedTariff = signal<ITariffCategory | null>(null);
  readonly openDropdownId = signal<number | null>(null);
  readonly expandedTariffs = signal<Set<number>>(new Set());

  // Modal para Crear / Asignar Rubro a la Tarifa
  readonly isRubroModalOpen = signal(false);
  readonly targetTariffForRubro = signal<ITariffCategory | null>(null);
  readonly isAssignRubroModalOpen = signal(false);
  readonly unassignedRubros = signal<IRubro[]>([]);
  readonly isLoadingUnassignedRubros = signal(false);
  readonly selectedRubroToAssign = signal<number | null>(null);
  readonly searchRubroTerm = signal('');
  readonly filterRubroTipo = signal<string>('');

  readonly filteredUnassignedRubros = computed(() => {
    const term = this.searchRubroTerm().toLowerCase().trim();
    const tipo = this.filterRubroTipo();
    return this.unassignedRubros().filter((r) => {
      const matchName =
        !term ||
        r.nombre.toLowerCase().includes(term) ||
        (r.codigoSri && r.codigoSri.toLowerCase().includes(term)) ||
        (r.descripcion && r.descripcion.toLowerCase().includes(term));
      const matchTipo = !tipo || r.tipoRubro === tipo;
      return matchName && matchTipo;
    });
  });

  toggleExpansion(id: number): void {
    this.expandedTariffs.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  expandAll(): void {
    const ids = this.filteredTariffs()
      .map((t) => t.categoriaTarifaId)
      .filter((id): id is number => id !== undefined);
    this.expandedTariffs.set(new Set(ids));
  }

  collapseAll(): void {
    this.expandedTariffs.set(new Set());
  }

  // Paginación
  readonly pageSizeOptions = [5, 10, 15, 20];
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);

  readonly filteredTariffs = computed(() => {
    const term = this.searchNombre().toLowerCase().trim();
    const list = this.tariffs();
    if (!term) return list;
    return list.filter(
      (t) =>
        t.nombre.toLowerCase().includes(term) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(term)),
    );
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTariffs().length / this.pageSize())),
  );

  readonly pagedTariffs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredTariffs().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadTariffs();
  }

  loadTariffs(): void {
    this.isLoading.set(true);

    this.tariffsService.getTariffs().subscribe({
      next: (data) => {
        this.tariffs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando tarifas:', err);
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.selectedTariff.set(null);
    this.isModalOpen.set(true);
  }

  clearFilters(): void {
    this.searchNombre.set('');
    this.currentPage.set(1);
    this.loadTariffs();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  toggleDropdown(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update((current) => (current === id ? null : id));
  }

  closeDropdowns(): void {
    if (this.openDropdownId() !== null) {
      this.openDropdownId.set(null);
    }
  }

  openEditModal(tariff: ITariffCategory): void {
    this.selectedTariff.set(tariff);
    this.isModalOpen.set(true);
  }

  deleteTariff(tariff: ITariffCategory): void {
    if (tariff.categoriaTarifaId === undefined) return;
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
    this.isModalOpen.set(false);
    this.selectedTariff.set(null);
  }

  onFormSubmitted(): void {
    this.closeModal();
    this.loadTariffs();
  }

  // Métodos de gestión de Rubros por Tarifa
  openCreateRubroForTariff(tariff: ITariffCategory): void {
    this.closeDropdowns();
    this.targetTariffForRubro.set(tariff);
    this.isAssignRubroModalOpen.set(false);
    this.isRubroModalOpen.set(true);
  }

  openAssignRubroModal(tariff: ITariffCategory): void {
    this.closeDropdowns();
    this.targetTariffForRubro.set(tariff);
    this.selectedRubroToAssign.set(null);
    this.isLoadingUnassignedRubros.set(true);
    this.isAssignRubroModalOpen.set(true);

    this.rubrosService.getRubros({ limit: 100 }).subscribe({
      next: (res) => {
        // Filtrar rubros que no estén ya asociados a esta categoría
        const existingIds = new Set((tariff.rubros ?? []).map((r) => r.rubroId));
        const available = res.data.filter((r) => !existingIds.has(r.rubroId));
        this.unassignedRubros.set(available);
        this.isLoadingUnassignedRubros.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar rubros disponibles', 'Error');
        this.isLoadingUnassignedRubros.set(false);
      },
    });
  }

  confirmAssignRubro(): void {
    const rubroId = this.selectedRubroToAssign();
    const tariff = this.targetTariffForRubro();
    if (!rubroId || !tariff || tariff.categoriaTarifaId === undefined) return;

    this.rubrosService
      .updateRubro(rubroId, { categoriaTarifaId: tariff.categoriaTarifaId })
      .subscribe({
        next: () => {
          this.toast.success('Rubro asignado a la tarifa exitosamente', 'Éxito');
          this.closeRubroModals();
          // Asegurar que la categoría quede expandida para visualizar el nuevo rubro
          this.expandedTariffs.update((set) => new Set([...set, tariff.categoriaTarifaId!]));
          this.loadTariffs();
        },
        error: (err: HttpErrorResponse) => {
          this.toast.error(err.error?.message ?? 'No se pudo asignar el rubro', 'Error');
        },
      });
  }

  unassignRubroFromTariff(rubro: IRubro, tariff: ITariffCategory): void {
    this.confirmDialog
      .confirm({
        title: 'Desvincular Rubro',
        message: `¿Desea desvincular el rubro "${rubro.nombre}" de la tarifa "${tariff.nombre}"?`,
        confirmText: 'Desvincular',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.rubrosService.updateRubro(rubro.rubroId, { categoriaTarifaId: null }).subscribe({
            next: () => {
              this.toast.success('Rubro desvinculado de la tarifa', 'Éxito');
              this.loadTariffs();
            },
            error: (err: HttpErrorResponse) => {
              this.toast.error(err.error?.message ?? 'No se pudo desvincular el rubro', 'Error');
            },
          });
        }
      });
  }

  closeRubroModals(): void {
    this.isRubroModalOpen.set(false);
    this.isAssignRubroModalOpen.set(false);
    this.targetTariffForRubro.set(null);
    this.selectedRubroToAssign.set(null);
  }

  onRubroSaved(): void {
    const tariffId = this.targetTariffForRubro()?.categoriaTarifaId;
    if (tariffId !== undefined) {
      this.expandedTariffs.update((set) => new Set([...set, tariffId]));
    }
    this.closeRubroModals();
    this.loadTariffs();
  }
}
