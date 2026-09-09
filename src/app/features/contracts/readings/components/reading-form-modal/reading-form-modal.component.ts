import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingsService } from '../../services/readings.service';
import { IReading, IUpdateReadingDto } from '../../interfaces/ireading.interface';
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';
import { PeriodPickerComponent } from '../../../../../shared/components/period-picker/period-picker.component';
import type { IAccountingPeriod } from '../../../../../shared/services/periods.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-reading-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent, PeriodPickerComponent],
  templateUrl: './reading-form-modal.component.html',
  styleUrl: './reading-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'close()' },
})
export class ReadingFormModalComponent implements OnInit {
  private readonly readingsService = inject(ReadingsService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly reading = input.required<IReading>();
  readonly saved = output<void>();
  readonly closed = output<void>();

  fecha = '';
  lecturaAnterior = 0;
  lecturaActual = 0;
  lecturaInicial = false;
  periodoId: number | null = null;
  descripcionAnomalia = '';
  isLoading = false;

  ngOnInit(): void {
    const reading = this.reading();
    this.fecha =
      typeof reading.fecha === 'string'
        ? reading.fecha.split('T')[0]
        : new Date(reading.fecha).toISOString().split('T')[0];
    this.lecturaAnterior = Number(reading.lecturaAnterior);
    this.lecturaActual = Number(reading.lecturaActual);
    this.lecturaInicial = reading.lecturaInicial;
    this.periodoId = reading.periodoId || null;
    this.descripcionAnomalia = reading.descripcionAnomalia || '';
  }

  onPeriodSelectedFromPicker(period: IAccountingPeriod | null): void {
    this.periodoId = period?.periodoId ?? null;
    this.cdr.markForCheck();
  }

  get calculatedConsumo(): number {
    return Math.max(0, Number(this.lecturaActual || 0) - Number(this.lecturaAnterior || 0));
  }

  get isFormValid(): boolean {
    return Boolean(
      this.fecha &&
      this.periodoId &&
      Number(this.lecturaAnterior) >= 0 &&
      Number(this.lecturaActual) >= 0,
    );
  }

  submit(): void {
    if (!this.isFormValid || this.isLoading) return;

    this.isLoading = true;
    const reading = this.reading();
    const updateDto: IUpdateReadingDto = {
      fecha: this.fecha,
      lecturaAnterior: Number(this.lecturaAnterior),
      lecturaActual: Number(this.lecturaActual),
      consumoCalculado: this.calculatedConsumo,
      descripcionAnomalia: this.descripcionAnomalia.trim() || undefined,
      lecturaInicial: this.lecturaInicial,
      periodoId: Number(this.periodoId),
      estado:
        reading.estado === 'PENDIENTE' && Number(this.lecturaActual) > 0
          ? 'POR_REVISION'
          : reading.estado,
    };

    this.readingsService.updateReading(reading.lecturaId, updateDto).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show('Lectura actualizada exitosamente', 'success');
        this.saved.emit();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al actualizar lectura';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    if (!this.isLoading) this.closed.emit();
  }
}
