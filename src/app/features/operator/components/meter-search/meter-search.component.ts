import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMeterDto } from '../../../contracts/meters/domain/models/meter.model';
import { MeterCardComponent } from '../meter-card/meter-card.component';
import { MeterSearchBoxComponent } from '../meter-search-box/meter-search-box.component';
import { EstadoChip, MeterGroup } from '../../readings/readings.models';

export interface VirtualMeterItem {
  meter: IMeterDto;
  status: { label: string; icon: string; cssClass: string | null };
}

@Component({
  selector: 'app-meter-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MeterSearchBoxComponent, MeterCardComponent],
  template: `
    <div class="meter-search-component">
      <app-meter-search-box
        [value]="searchQuery()"
        (valueChange)="onSearchChange($event)"
        [disabled]="disabled()"
      />

      @if (filterChips().length > 0) {
        <div class="estado-filters" role="group" aria-label="Filtros de estado">
          @for (chip of filterChips(); track chip.value) {
            <button
              type="button"
              class="filter-chip"
              [class.active]="selectedEstadoFilter() === chip.value"
              (click)="onFilterChange(chip.value)"
              [attr.aria-pressed]="selectedEstadoFilter() === chip.value"
            >
              <i [class]="'bi ' + chip.icon"></i> {{ chip.label }}
            </button>
          }
        </div>
      }

      <div class="meters-list">
        @if (isLoading()) {
          <div class="loading-state" role="status" aria-live="polite">
            <span class="spinner-sm"></span>
            Cargando medidores...
          </div>
        }

        @if (filteredItems().length === 0 && !isLoading()) {
          <div class="empty-state">
            <i class="bi bi-inbox"></i>
            <p>
              {{
                searchQuery() ? 'Sin resultados para la búsqueda.' : 'No hay medidores cargados.'
              }}
            </p>
          </div>
        }

        @if (filteredItems().length > 0) {
          @for (item of pagedItems(); track item.meter.medidorId) {
            <div class="virtual-meter-row">
              <app-meter-card
                [meter]="item.meter"
                [status]="item.status"
                (meterSelect)="onMeterSelect($event)"
              />
            </div>
          }
        }
      </div>
      @if (filteredItems().length > 0) {
        <nav class="meter-pagination" aria-label="Páginas de medidores">
          <span>Mostrando {{ rangeStart() }}–{{ rangeEnd() }} de {{ filteredItems().length }}</span>
          @if (pageCount() > 1) {
            <div class="meter-pagination-actions">
              <button
                type="button"
                (click)="goToPage(currentPage() - 1)"
                [disabled]="currentPage() === 1"
                aria-label="Página anterior de medidores"
              >
                Anterior
              </button>
              <span aria-live="polite">Página {{ currentPage() }} de {{ pageCount() }}</span>
              <button
                type="button"
                (click)="goToPage(currentPage() + 1)"
                [disabled]="currentPage() === pageCount()"
                aria-label="Página siguiente de medidores"
              >
                Siguiente
              </button>
            </div>
          }
        </nav>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .meter-search-component {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .estado-filters {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding-bottom: 4px;
      }
      .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.75rem;
        border-radius: 20px;
        border: 1px solid var(--border-color, #e2e8f0);
        background: var(--white, #fff);
        color: var(--dark-text, #334155);
        font-size: 0.8rem;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
      }
      .filter-chip.active {
        background: var(--primary-color, #0c9ea1);
        color: #fff;
        border-color: var(--primary-color, #0c9ea1);
      }
      .virtual-meter-row {
        padding-bottom: 8px;
        box-sizing: border-box;
      }
      .meter-pagination,
      .meter-pagination-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.7rem;
      }
      .meter-pagination {
        justify-content: space-between;
        color: var(--op-text-secondary, #4b6366);
        font-size: 0.85rem;
      }
      .meter-pagination button {
        min-height: 40px;
        padding: 0.45rem 0.75rem;
        border: 1px solid var(--op-border-subtle, #d1e7e8);
        border-radius: 10px;
        background: var(--op-bg-surface, #fff);
        color: var(--op-brand-primary-dark, #005f73);
        font-weight: 700;
      }
      .meter-pagination button:disabled {
        opacity: 0.45;
      }
      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--muted-text, #64748b);
        gap: 0.5rem;
      }
    `,
  ],
})
export class MeterSearchComponent {
  readonly groups = input.required<MeterGroup[]>();
  readonly filterChips = input<EstadoChip[]>([]);
  readonly isLoading = input(false);
  readonly disabled = input(false);

  readonly meterSelected = output<IMeterDto>();
  readonly searchQueryChange = output<string>();
  readonly filterChange = output<string>();

  readonly searchQuery = signal<string>('');
  readonly selectedEstadoFilter = signal<string>('todas');
  readonly pageSize = 10;
  readonly requestedPage = signal(1);

  readonly filteredItems = computed<VirtualMeterItem[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.selectedEstadoFilter();
    const items: VirtualMeterItem[] = [];

    for (const group of this.groups()) {
      if (filter !== 'todas' && group.estado !== filter) continue;
      for (const meter of group.meters) {
        if (
          !query ||
          meter.serie.toLowerCase().includes(query) ||
          (meter.contratoId && meter.contratoId.toString().toLowerCase().includes(query)) ||
          (meter.clienteNombre && meter.clienteNombre.toLowerCase().includes(query)) ||
          (meter.marca && meter.marca.toLowerCase().includes(query))
        ) {
          items.push({ meter, status: group.info });
        }
      }
    }
    return items;
  });

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredItems().length / this.pageSize)),
  );
  readonly currentPage = computed(() => Math.min(this.requestedPage(), this.pageCount()));
  readonly pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredItems().slice(start, start + this.pageSize);
  });
  readonly rangeStart = computed(() =>
    this.filteredItems().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0,
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filteredItems().length),
  );

  goToPage(page: number): void {
    this.requestedPage.set(Math.max(1, Math.min(page, this.pageCount())));
  }

  onMeterSelect(meter: IMeterDto): void {
    this.meterSelected.emit(meter);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.requestedPage.set(1);
    this.searchQueryChange.emit(value);
  }

  onFilterChange(value: string): void {
    this.selectedEstadoFilter.set(value);
    this.requestedPage.set(1);
    this.filterChange.emit(value);
  }
}
