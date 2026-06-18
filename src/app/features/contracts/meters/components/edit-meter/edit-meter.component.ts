import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IEditMeterStatusPayload, IMeterStatus, IMeter } from '../../interfaces/imeter.interface';

/**
 * Componente de Edición de Estado de MetersComponent
 * Permite la actualización del ciclo de vida de un medidor (estado) y el registro de observaciones técnicas.
 */
@Component({
  selector: 'app-edit-meter',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-meter.component.html',
  styleUrl: './edit-meter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMeterComponent {
  // Entradas de datos y estado de carga
  meter = input<IMeter | null>(null);
  isSaving = input<boolean>(false);
  errorMessage = input<string>('');
  statuses = input<IMeterStatus[]>([]);

  // Emisores de eventos para comunicación con el contenedor
  save = output<IEditMeterStatusPayload>();
  cancelRegister = output<void>();

  // Inyección de dependencias y constantes de negocio
  private readonly fb = inject(FormBuilder);

  /**
   * Estructura reactiva del formulario de actualización
   */
  form = this.fb.group({
    codigo: ['', Validators.required],
    observacion: ['', Validators.maxLength(255)],
  });

  constructor() {
    effect(() => {
      const selectedMeter = this.meter();
      if (selectedMeter) {
        this.form.patchValue({
          codigo: selectedMeter.estado?.codigo || '',
          observacion: '',
        });
      }
    });
  }

  /**
   * Procesa la actualización del estado y emite el payload de cambios
   * validando que exista un medidor seleccionado y no haya operaciones en curso.
   */
  submit(): void {
    const selectedMeter = this.meter();
    if (!selectedMeter || this.isSaving()) return;
    const rawValues = this.form.getRawValue();
    if (rawValues.codigo) {
      this.save.emit({
        medidorId: selectedMeter.medidorId,
        estado: rawValues.codigo,
        motivo: rawValues.observacion || '',
      });
    }
  }

  /**
   * Notifica la cancelación de la edición, bloqueando el cierre si se está guardando.
   */
  close(): void {
    if (!this.isSaving()) this.cancel.emit();
  }
}
