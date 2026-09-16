import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const SELECTION_MODES = {
  DAY: 'day',
  MONTH: 'month',
  YEAR: 'year',
} as const;
type SelectionMode = (typeof SELECTION_MODES)[keyof typeof SELECTION_MODES];

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-date-picker',
  imports: [ClickOutsideDirective],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerComponent {
  private readonly elementRef = inject(ElementRef);

  readonly value = input<string>('');
  readonly placeholder = input('Seleccione una fecha');
  readonly inputId = input<string>('');
  readonly disabled = input(false);
  readonly selectionMode = input<SelectionMode>(SELECTION_MODES.DAY);
  readonly allowPeriodNavigation = input(false);

  readonly valueChange = output<string>();

  readonly isOpen = signal(false);
  readonly openUpwards = signal(false);
  readonly viewDate = signal(new Date());
  readonly navigationView = signal<SelectionMode>(SELECTION_MODES.DAY);

  // Semana arranca en Lunes: JS devuelve 0=Dom ... 6=Sáb
  readonly diasSemana = DIAS_SEMANA;

  readonly activeView = computed(() =>
    this.allowPeriodNavigation() ? this.navigationView() : this.selectionMode(),
  );

  readonly viewLabel = computed(() => {
    const d = this.viewDate();
    if (this.activeView() === SELECTION_MODES.YEAR) {
      const firstYear = Math.floor(d.getFullYear() / 10) * 10;
      return `${firstYear} - ${firstYear + 9}`;
    }
    if (this.activeView() === SELECTION_MODES.MONTH) {
      return `${d.getFullYear()}`;
    }
    return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
  });

  readonly celdas = computed(() => {
    const view = this.viewDate();
    const year = view.getFullYear();
    const month = view.getMonth();

    const firstDay = new Date(year, month, 1);
    // offset: Lunes=0 ... Domingo=6
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day));
    }
    return cells;
  });

  readonly meses = computed(() =>
    MESES.map((nombre, month) => ({
      nombre,
      date: new Date(this.viewDate().getFullYear(), month, 1),
    })),
  );

  readonly years = computed(() => {
    const firstYear = Math.floor(this.viewDate().getFullYear() / 10) * 10;
    return Array.from({ length: 10 }, (_, index) => firstYear + index);
  });

  constructor() {
    // Al abrir, sincronizar el mes visible con el valor actual (si existe)
    effect(() => {
      if (this.isOpen()) {
        const parsed = this.parseValue(
          this.value(),
          this.allowPeriodNavigation() ? SELECTION_MODES.DAY : this.selectionMode(),
        );
        if (parsed) {
          this.viewDate.set(parsed);
        }
      }
    });
  }

  toggle(): void {
    if (!this.isOpen()) {
      this.checkPlacement();
      if (this.allowPeriodNavigation()) {
        this.navigationView.set(SELECTION_MODES.DAY);
      }
      this.isOpen.set(true);
    } else {
      this.isOpen.set(false);
    }
  }

  private checkPlacement(): void {
    const el = this.elementRef.nativeElement as HTMLElement;
    const rect = el.getBoundingClientRect();
    const popoverHeight = 310; // Alto aproximado del popover de calendario
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Si no hay suficiente espacio abajo (menos de 310px) y arriba hay más espacio, abrir hacia arriba
    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      this.openUpwards.set(true);
    } else {
      this.openUpwards.set(false);
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  // Cierra el calendario con la tecla Escape
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }

  prevMonth(): void {
    const d = this.viewDate();
    if (this.activeView() === SELECTION_MODES.DAY) {
      this.viewDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else if (this.activeView() === SELECTION_MODES.MONTH) {
      this.viewDate.set(new Date(d.getFullYear() - 1, d.getMonth(), 1));
    } else {
      this.viewDate.set(new Date(d.getFullYear() - 10, d.getMonth(), 1));
    }
  }

  nextMonth(): void {
    const d = this.viewDate();
    if (this.activeView() === SELECTION_MODES.DAY) {
      this.viewDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else if (this.activeView() === SELECTION_MODES.MONTH) {
      this.viewDate.set(new Date(d.getFullYear() + 1, d.getMonth(), 1));
    } else {
      this.viewDate.set(new Date(d.getFullYear() + 10, d.getMonth(), 1));
    }
  }

  isToday(day: Date): boolean {
    const now = new Date();
    return (
      day.getFullYear() === now.getFullYear() &&
      day.getMonth() === now.getMonth() &&
      day.getDate() === now.getDate()
    );
  }

  isSelected(day: Date): boolean {
    return this.toValue(day) === this.value();
  }

  select(day: Date): void {
    if (this.allowPeriodNavigation() && this.activeView() === SELECTION_MODES.MONTH) {
      this.viewDate.set(new Date(day.getFullYear(), day.getMonth(), 1));
      this.navigationView.set(SELECTION_MODES.DAY);
      return;
    }
    this.valueChange.emit(this.toValue(day));
    this.isOpen.set(false);
  }

  isSelectedYear(year: number): boolean {
    if (this.allowPeriodNavigation()) {
      return this.parseValue(this.value(), SELECTION_MODES.DAY)?.getFullYear() === year;
    }
    return this.value() === String(year);
  }

  selectYear(year: number): void {
    if (this.allowPeriodNavigation()) {
      const current = this.viewDate();
      this.viewDate.set(new Date(year, current.getMonth(), 1));
      this.navigationView.set(SELECTION_MODES.MONTH);
      return;
    }
    this.valueChange.emit(String(year));
    this.isOpen.set(false);
  }

  isSelectedMonth(date: Date): boolean {
    const selected = this.parseValue(this.value(), SELECTION_MODES.DAY);
    return (
      selected?.getFullYear() === date.getFullYear() && selected?.getMonth() === date.getMonth()
    );
  }

  showParentPeriod(): void {
    if (!this.allowPeriodNavigation() || this.activeView() === SELECTION_MODES.YEAR) return;
    this.navigationView.set(
      this.activeView() === SELECTION_MODES.DAY ? SELECTION_MODES.MONTH : SELECTION_MODES.YEAR,
    );
  }

  private toValue(date: Date): string {
    if (this.allowPeriodNavigation()) {
      return this.toIso(date);
    }
    if (this.selectionMode() === SELECTION_MODES.YEAR) {
      return String(date.getFullYear());
    }
    if (this.selectionMode() === SELECTION_MODES.MONTH) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    return this.toIso(date);
  }

  private parseValue(value: string, mode: SelectionMode): Date | null {
    const pattern =
      mode === SELECTION_MODES.DAY
        ? /^(\d{4})-(\d{2})-(\d{2})$/
        : mode === SELECTION_MODES.MONTH
          ? /^(\d{4})-(\d{2})$/
          : /^(\d{4})$/;
    const match = value.match(pattern);
    if (!match) return null;

    const year = Number(match[1]);
    const month = mode === SELECTION_MODES.YEAR ? 1 : Number(match[2]);
    const day = mode === SELECTION_MODES.DAY ? Number(match[3]) : 1;
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
      ? parsed
      : null;
  }

  private toIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
