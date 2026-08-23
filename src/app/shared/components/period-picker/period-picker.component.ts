import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerInputComponent } from '../picker-input/picker-input.component';
import { ReadingRoutesService } from '../../../features/contracts/reading-routes/services/reading-routes.service';

export interface IPeriodItem {
  periodoId: number;
  nombre?: string;
  estado: string;
}

@Component({
  selector: 'app-period-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerInputComponent],
  templateUrl: './period-picker.component.html',
  styleUrl: './period-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodPickerComponent implements OnInit {
  private readonly routesService = inject(ReadingRoutesService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly inputId = input<string>('periodPickerInput');
  readonly label = input<string>('Período Contable');
  readonly placeholder = input<string>('Buscar período (ej. Enero 2026)...');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly selectedPeriodId = input<number | null>(null);

  readonly periodSelected = output<IPeriodItem | null>();

  readonly periods = signal<IPeriodItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly currentSelected = signal<IPeriodItem | null>(null);

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

  ngOnInit(): void {
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.isLoading.set(true);
    this.routesService.getPeriods().subscribe({
      next: (data) => {
        this.periods.set(data || []);
        this.isLoading.set(false);
        const initialId = this.selectedPeriodId();
        if (initialId) {
          const match = data.find((p) => p.periodoId === initialId);
          if (match) {
            this.selectPeriod(match, false);
          }
        }
      },
      error: () => {
        this.periods.set([]);
        this.isLoading.set(false);
      },
    });
  }

  onQueryChange(val: string): void {
    this.searchQuery.set(val);
  }

  onOpenChange(open: boolean): void {
    this.isOpen.set(open);
  }

  selectPeriod(period: IPeriodItem, emit = true): void {
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
