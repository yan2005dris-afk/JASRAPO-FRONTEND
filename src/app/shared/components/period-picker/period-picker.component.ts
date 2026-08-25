import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerInputComponent } from '../picker-input/picker-input.component';
import { IAccountingPeriod, PeriodsService } from '../../services/periods.service';

@Component({
  selector: 'app-period-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerInputComponent],
  templateUrl: './period-picker.component.html',
  styleUrl: './period-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodPickerComponent {
  private readonly periodsService = inject(PeriodsService);

  readonly inputId = input<string>('periodPickerInput');
  readonly label = input<string>('Período Contable');
  readonly placeholder = input<string>('Buscar período (ej. Enero 2026)...');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly selectedPeriodId = input<number | null>(null);

  readonly periodSelected = output<IAccountingPeriod | null>();

  readonly periods = signal<IAccountingPeriod[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly currentSelected = signal<IAccountingPeriod | null>(null);

  readonly filteredPeriods = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.periods();
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.nombre && p.nombre.toLowerCase().includes(q)) ||
        p.periodoId.toString().includes(q) ||
        p.estado.toLowerCase().includes(q),
    );
  });

  constructor() {
    this.periodsService
      .getPeriods()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (data) => {
          this.periods.set(data || []);
          this.isLoading.set(false);
        },
        error: () => {
          this.periods.set([]);
          this.isLoading.set(false);
        },
      });

    // Sincronizar `currentSelected` cuando el padre cambia `selectedPeriodId`
    // o cuando la lista de períodos termina de cargar. La lectura de
    // `currentSelected` se hace con `untracked` para que el effect no reaccione
    // a mutaciones internas (p. ej. selección manual del usuario).
    effect(() => {
      const selectedId = this.selectedPeriodId();
      const list = this.periods();

      if (selectedId === null) {
        untracked(() => this.currentSelected.set(null));
        return;
      }
      if (list.length === 0) return;

      const current = untracked(() => this.currentSelected());
      if (current && current.periodoId === selectedId) return;

      const match = list.find((p) => p.periodoId === selectedId);
      if (match) {
        untracked(() => {
          this.currentSelected.set(match);
          this.searchQuery.set(match.nombre || `Período #${match.periodoId}`);
        });
      }
    });
  }

  onQueryChange(val: string): void {
    this.searchQuery.set(val);
  }

  onOpenChange(open: boolean): void {
    this.isOpen.set(open);
  }

  selectPeriod(period: IAccountingPeriod, emit = true): void {
    this.currentSelected.set(period);
    this.searchQuery.set(period.nombre || `Período #${period.periodoId}`);
    this.isOpen.set(false);
    if (emit) {
      this.periodSelected.emit(period);
    }
  }

  clearSelection(): void {
    this.currentSelected.set(null);
    this.searchQuery.set('');
    this.isOpen.set(false);
    this.periodSelected.emit(null);
  }

  getEstadoBadgeClass(estado: string): string {
    const st = estado?.toUpperCase() || '';
    if (st === 'ABIERTO' || st === 'ACTIVO') return 'bg-success-subtle text-success';
    if (st === 'CERRADO') return 'bg-secondary-subtle text-secondary';
    return 'bg-light text-dark';
  }
}
