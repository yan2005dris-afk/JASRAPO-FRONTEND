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
import {
  ICreateReadingDto,
  IReading,
  IUpdateReadingDto,
} from '../../interfaces/ireading.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-reading-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reading-form-modal.component.html',
  styleUrl: './reading-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingFormModalComponent implements OnInit {
  private readonly readingsService = inject(ReadingsService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly reading = input<IReading | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  medidorId = '';
  fecha = '';
  lecturaAnterior = 0;
  lecturaActual = 0;
  lecturaInicial = false;
  periodoId = 1;
  descripcionAnomalia = '';

  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  isLoading = false;

  ngOnInit(): void {
    const r = this.reading();
    if (r) {
      this.medidorId = r.medidor?.medidorId || '';
      this.fecha = typeof r.fecha === 'string' ? r.fecha.split('T')[0] : new Date(r.fecha).toISOString().split('T')[0];
      this.lecturaAnterior = Number(r.lecturaAnterior);
      this.lecturaActual = Number(r.lecturaActual);
      this.lecturaInicial = r.lecturaInicial;
      this.periodoId = r.periodoId || 1;
      this.descripcionAnomalia = r.descripcionAnomalia || '';
      this.imagePreviewUrl = r.fotoUrl || null;
    } else {
      this.fecha = new Date().toISOString().split('T')[0];
    }
  }

  get calculatedConsumo(): number {
    return Math.max(0, Number(this.lecturaActual || 0) - Number(this.lecturaAnterior || 0));
  }

  get isFormValid(): boolean {
    if (!this.medidorId && !this.reading()) return false;
    if (!this.fecha) return false;
    if (this.lecturaActual < 0 || this.lecturaAnterior < 0) return false;
    return true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.cdr.markForCheck();
  }

  submit(): void {
    if (!this.isFormValid || this.isLoading) return;

    this.isLoading = true;
    const isEdit = !!this.reading();

    if (isEdit) {
      const updateDto: IUpdateReadingDto = {
        fecha: this.fecha,
        lecturaAnterior: Number(this.lecturaAnterior),
        lecturaActual: Number(this.lecturaActual),
        consumoCalculado: this.calculatedConsumo,
        descripcionAnomalia: this.descripcionAnomalia.trim() || undefined,
        lecturaInicial: this.lecturaInicial,
        periodoId: Number(this.periodoId),
      };

      this.readingsService
        .updateReading(this.reading()!.lecturaId, updateDto, this.selectedFile || undefined)
        .subscribe({
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
    } else {
      const createDto: ICreateReadingDto = {
        medidorId: this.medidorId,
        fecha: this.fecha,
        lecturaAnterior: Number(this.lecturaAnterior),
        lecturaActual: Number(this.lecturaActual),
        consumoCalculado: this.calculatedConsumo,
        descripcionAnomalia: this.descripcionAnomalia.trim() || undefined,
        lecturaInicial: this.lecturaInicial,
        periodoId: Number(this.periodoId),
      };

      this.readingsService
        .createReading(createDto, this.selectedFile || undefined)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.show('Lectura registrada exitosamente', 'success');
            this.saved.emit();
          },
          error: (err) => {
            this.isLoading = false;
            const msg = err?.error?.message || 'Error al registrar lectura';
            this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
            this.cdr.markForCheck();
          },
        });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
