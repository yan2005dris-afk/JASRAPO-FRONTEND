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
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { TariffsApi } from './data/tariffs.api';
import { ITariffCategory } from './domain/models/tariff.model';
import { TariffsFormComponent } from './components/tariffs-form/tariffs-form.component';
import { RubroFormModalComponent } from '../../billing/rubros/components/rubro-form-modal/rubro-form-modal.component';
import { RubroTableComponent } from '../../billing/rubros/components/rubro-table/rubro-table.component';
import { RubrosService } from '../../billing/rubros/services/rubros.service';
import { IRubro } from '../../billing/rubros/interfaces/irubro.interface';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableExportService } from '../../../shared/services/table-export.service';
import {
  DropdownComponent,
  DropdownItem,
} from '../../../shared/components/dropdown/dropdown.component';

/** Tamaño de página al descargar el listado completo: el backend topa `limit` en 50. */
const EXPORT_PAGE_SIZE = 50;

@Component({
  selector: 'app-tariffs',
  imports: [
    CommonModule,
    FormsModule,
    TariffsFormComponent,
    RubroFormModalComponent,
    RubroTableComponent,
    PaginationComponent,
    TableSkeletonComponent,
    DropdownComponent,
  ],
  templateUrl: './tariffs.component.html',
  styleUrl: './tariffs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class TariffsComponent implements OnInit {
  private readonly tariffsService = inject(TariffsApi);
  private readonly rubrosService = inject(RubrosService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

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
  readonly totalItems = signal(0);
  readonly searchTerm = signal('');
  readonly appliedSearchTerm = signal('');
  readonly isModalOpen = signal(false);
  readonly selectedTariff = signal<ITariffCategory | null>(null);
  readonly openDropdownId = signal<number | null>(null);
  readonly expandedTariffs = signal<Set<number>>(new Set());

  // Modal para Crear / Editar / Asignar Rubro a la Tarifa
  readonly isRubroModalOpen = signal(false);
  readonly selectedRubroForEdit = signal<IRubro | null>(null);
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

  // Paginación
  readonly pageSizeOptions = [5, 10, 15, 20];
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);

  ngOnInit(): void {
    this.loadTariffs();
  }

  loadTariffs(): void {
    this.isLoading.set(true);

    const term = this.appliedSearchTerm().trim();

    this.tariffsService
      .getTariffs({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: term || undefined,
      })
      .subscribe({
        next: (res) => {
          const data = res.data ?? [];
          this.tariffs.set(data);
          this.totalItems.set(res.meta?.total ?? data.length);
          this.isLoading.set(false);
        },
        error: () => {
          this.tariffs.set([]);
          this.totalItems.set(0);
          this.isLoading.set(false);
          this.toast.show('No se pudieron cargar las tarifas', 'error');
        },
      });
  }

  onSearchTermChange(term: string): void {
    this.searchTerm.set(term);
  }

  applySearch(): void {
    this.appliedSearchTerm.set(this.searchTerm().trim());
    this.currentPage.set(1);
    this.loadTariffs();
  }

  openCreateModal(): void {
    this.selectedTariff.set(null);
    this.isModalOpen.set(true);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.appliedSearchTerm.set('');
    this.currentPage.set(1);
    this.loadTariffs();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadTariffs();
  }

  goToPage(page: number): void {
    if (page < 1) return;
    this.currentPage.set(page);
    this.loadTariffs();
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
    this.selectedRubroForEdit.set(null);
    this.isAssignRubroModalOpen.set(false);
    this.isRubroModalOpen.set(true);
  }

  openEditRubroForTariff(rubro: IRubro, tariff: ITariffCategory): void {
    this.closeDropdowns();
    this.targetTariffForRubro.set(tariff);
    this.selectedRubroForEdit.set(rubro);
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
    this.selectedRubroForEdit.set(null);
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

  // ---------- Exportaciones (PDF, Excel, CSV) ----------
  private readonly tableExportService = inject(TableExportService);

  exportToPdf(): void {
    this.withAllTariffs((list) => this.buildPdfExport(list));
  }

  exportToExcel(): void {
    this.withAllTariffs((list) => this.buildExcelExport(list));
  }

  exportToCsv(): void {
    this.withAllTariffs((list) => this.buildCsvExport(list));
  }

  private withAllTariffs(run: (list: ITariffCategory[]) => void): void {
    this.fetchAllTariffs().subscribe({
      next: run,
      error: () => this.toast.show('No se pudieron obtener las tarifas para exportar', 'error'),
    });
  }

  /**
   * La tabla ahora pagina contra el backend, así que exportar solo la página
   * visible dejaría fuera al resto. Esto recorre todas las páginas que
   * coincidan con la búsqueda activa para exportar el listado completo.
   */
  private fetchAllTariffs(): Observable<ITariffCategory[]> {
    const search = this.appliedSearchTerm().trim() || undefined;
    const limit = EXPORT_PAGE_SIZE;

    return this.tariffsService.getTariffs({ page: 1, limit, search }).pipe(
      switchMap((first) => {
        const rows = first.data ?? [];
        const total = first.meta?.total ?? rows.length;
        const pages = Math.ceil(total / limit);
        if (pages <= 1) return of(rows);

        const rest: Observable<ITariffCategory[]>[] = [];
        for (let page = 2; page <= pages; page++) {
          rest.push(
            this.tariffsService
              .getTariffs({ page, limit, search })
              .pipe(map((res) => res.data ?? [])),
          );
        }

        return forkJoin(rest).pipe(map((pagesData) => rows.concat(...pagesData)));
      }),
    );
  }

  private buildPdfExport(list: ITariffCategory[]): void {
    if (list.length === 0) return;

    this.tableExportService.exportToPdf({
      title: 'LISTADO DE CATEGORÍAS DE TARIFAS',
      fileName: `Tarifas_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        {
          header: 'ID',
          transform: (t) => (t as unknown as ITariffCategory).categoriaTarifaId ?? '—',
          width: 35,
          align: 'center',
        },
        { header: 'Categoría', key: 'nombre', width: 140 },
        {
          header: 'Consumo Mínimo (m³)',
          transform: (t) => `${(t as unknown as ITariffCategory).consumoMinimoMensual ?? 0} m³`,
          width: 90,
          align: 'center',
        },
        { header: 'Descripción', key: 'descripcion', width: 180 },
        {
          header: 'Estado',
          transform: (t) => ((t as unknown as ITariffCategory).activo ? 'ACTIVO' : 'INACTIVO'),
          width: 60,
          align: 'center',
        },
      ],
      data: list as unknown as Record<string, unknown>[],
      summary: `Total de categorías de tarifa: ${list.length}`,
    });
  }

  private buildExcelExport(list: ITariffCategory[]): void {
    if (list.length === 0) return;

    this.tableExportService.exportToExcel({
      title: 'LISTADO DE CATEGORÍAS DE TARIFAS',
      fileName: `Tarifas_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        {
          header: 'ID',
          transform: (t) => (t as unknown as ITariffCategory).categoriaTarifaId ?? '—',
        },
        { header: 'Categoría', key: 'nombre' },
        {
          header: 'Consumo Mínimo Mensual (m³)',
          key: 'consumoMinimoMensual',
        },
        { header: 'Descripción', key: 'descripcion' },
        {
          header: 'Estado',
          transform: (t) => ((t as unknown as ITariffCategory).activo ? 'ACTIVO' : 'INACTIVO'),
        },
      ],
      data: list as unknown as Record<string, unknown>[],
      summary: `Total de categorías de tarifa: ${list.length}`,
    });
  }

  private buildCsvExport(list: ITariffCategory[]): void {
    if (list.length === 0) return;

    this.tableExportService.exportToCsv({
      title: 'LISTADO DE CATEGORÍAS DE TARIFAS',
      fileName: `Tarifas_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        {
          header: 'ID',
          transform: (t) => (t as unknown as ITariffCategory).categoriaTarifaId ?? '—',
        },
        { header: 'Categoría', key: 'nombre' },
        {
          header: 'Consumo Mínimo Mensual (m³)',
          key: 'consumoMinimoMensual',
        },
        { header: 'Descripción', key: 'descripcion' },
        {
          header: 'Estado',
          transform: (t) => ((t as unknown as ITariffCategory).activo ? 'ACTIVO' : 'INACTIVO'),
        },
      ],
      data: list as unknown as Record<string, unknown>[],
    });
  }
}
