import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ICreateMeterPayload,
  IEditMeterStatusPayload,
  IMeter,
  IMeterStatus,
} from '../../interfaces/imeter.interface';

/**
 * Componente de Formulario para Medidores (Registro y Edición)
 * Gestiona la captura de datos de nuevos equipos y la edición de estados.
 */
@Component({
  selector: 'app-meters-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './meters-form.component.html',
  styleUrl: './meters-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetersFormComponent {
  // Comunicación con el componente padre
  isEdit = input<boolean>(false);
  meter = input<IMeter | null>(null);
  statuses = input<IMeterStatus[]>([]);

  isSaving = input<boolean>(false);
  errorMessage = input<string>('');

  saveCreate = output<ICreateMeterPayload>();
  saveEdit = output<IEditMeterStatusPayload>();
  cancelForm = output<void>();

  // Inyección de dependencias para formularios reactivos
  private readonly fb = inject(FormBuilder);

  /**
   * Configuración del formulario reactivo
   */
  form = this.fb.nonNullable.group({
    serie: ['', [Validators.maxLength(50)]],
    marca: ['', [Validators.maxLength(50)]],
    modelo: ['', [Validators.maxLength(50)]],
    codigo: [''],
    observacion: ['', [Validators.maxLength(255)]],
  });

  constructor() {
    effect(() => {
      if (this.isEdit()) {
        this.form.controls.serie.clearValidators();
        this.form.controls.marca.clearValidators();
        this.form.controls.modelo.clearValidators();

        this.form.controls.codigo.setValidators([Validators.required]);

        const selectedMeter = this.meter();
        if (selectedMeter) {
          this.form.patchValue({
            codigo: selectedMeter.estado?.codigo || '',
            observacion: '',
          });
        }
      } else {
        this.form.controls.codigo.clearValidators();

        this.form.controls.serie.setValidators([Validators.required, Validators.maxLength(50)]);
        this.form.controls.marca.setValidators([Validators.required, Validators.maxLength(50)]);
        this.form.controls.modelo.setValidators([Validators.required, Validators.maxLength(50)]);
      }
      this.form.controls.serie.updateValueAndValidity();
      this.form.controls.marca.updateValueAndValidity();
      this.form.controls.modelo.updateValueAndValidity();
      this.form.controls.codigo.updateValueAndValidity();
    });
  }

  /**
   * Gestiona el cierre del modal.
   * Bloquea la acción si existe una operación de guardado en curso.
   */
  closeForm(): void {
    if (this.isSaving()) {
      return;
    }
    this.cancelForm.emit();
  }

  /**
   * Valida y procesa el envío del formulario.
   */
  submit(): void {
    if (this.isSaving() || this.form.invalid) {
      return;
    }

    const rawValues = this.form.getRawValue();

    if (this.isEdit()) {
      const selectedMeter = this.meter();
      if (!selectedMeter) return;

      this.saveEdit.emit({
        medidorId: selectedMeter.medidorId!,
        estado: rawValues.codigo!,
        motivo: rawValues.observacion || '',
      });
    } else {
      this.saveCreate.emit({
        serie: rawValues.serie!,
        marca: rawValues.marca!,
        modelo: rawValues.modelo!,
      });
    }
  }
}
