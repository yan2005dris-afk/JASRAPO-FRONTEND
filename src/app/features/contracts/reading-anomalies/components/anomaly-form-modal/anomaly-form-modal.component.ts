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
import { ReadingAnomaliesService } from '../../services/reading-anomalies.service';
import {
  ICreateReadingAnomalyDto,
  IReadingAnomaly,
  IUpdateReadingAnomalyDto,
  TipoAnomalia,
} from '../../interfaces/ianomaly.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-anomaly-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './anomaly-form-modal.component.html',
  styleUrl: './anomaly-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnomalyFormModalComponent implements OnInit {
  private readonly anomaliesService = inject(ReadingAnomaliesService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly anomaly = input<IReadingAnomaly | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  lecturaId = '';
  tipo: TipoAnomalia = 'FUGA';
  observacion = '';

  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  isLoading = false;

  readonly tipoOptions: { value: TipoAnomalia; label: string }[] = [
    { value: 'FUGA', label: 'Fuga de Agua' },
    { value: 'MEDIDOR_DAÑADO', label: 'Medidor Dañado / Inoperativo' },
    { value: 'LECTURA_ERRONEA', label: 'Lectura Errónea / Incongruente' },
    { value: 'OTRO', label: 'Otro Incidente' },
  ];

  ngOnInit(): void {
    const a = this.anomaly();
    if (a) {
      this.lecturaId = a.lecturaId;
      this.tipo = a.tipo as TipoAnomalia;
      this.observacion = a.observacion || '';
      this.imagePreviewUrl = a.fotoUrl || null;
    }
  }

  get isFormValid(): boolean {
    return !!this.lecturaId.trim() && !!this.tipo;
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
    const isEdit = !!this.anomaly();

    if (isEdit) {
      const updateDto: IUpdateReadingAnomalyDto = {
        tipo: this.tipo,
        observacion: this.observacion.trim() || undefined,
      };

      this.anomaliesService
        .updateAnomaly(this.anomaly()!.anomaliaId, updateDto, this.selectedFile || undefined)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.show('Anomalía actualizada exitosamente', 'success');
            this.saved.emit();
          },
          error: (err) => {
            this.isLoading = false;
            const msg = err?.error?.message || 'Error al actualizar anomalía';
            this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
            this.cdr.markForCheck();
          },
        });
    } else {
      const createDto: ICreateReadingAnomalyDto = {
        lecturaId: this.lecturaId.trim(),
        tipo: this.tipo,
        observacion: this.observacion.trim() || undefined,
      };

      this.anomaliesService
        .createAnomaly(createDto, this.selectedFile || undefined)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.show('Anomalía reportada exitosamente', 'success');
            this.saved.emit();
          },
          error: (err) => {
            this.isLoading = false;
            const msg = err?.error?.message || 'Error al reportar anomalía';
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
