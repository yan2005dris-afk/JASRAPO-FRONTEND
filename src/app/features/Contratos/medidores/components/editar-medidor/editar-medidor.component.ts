import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  EditarEstadoMedidorPayload,
  IEstadoMedidor,
  IMedidor,
} from '../../interfaces/imedidor.interface';

/**
 * Componente de Edición de Estado de Medidores
 * Permite la actualización del ciclo de vida de un medidor (estado) y el registro de observaciones técnicas.
 */
@Component({
  selector: 'app-editar-medidor',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-medidor.component.html',
  styleUrl: './editar-medidor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarMedidorComponent {
  // Entradas de datos y estado de carga
  medidor = input<IMedidor | null>(null);
  isSaving = input<boolean>(false);
  errorMessage = input<string>('');
  estados = input<IEstadoMedidor[]>([]);

  // Emisores de eventos para comunicación con el contenedor
  guardar = output<EditarEstadoMedidorPayload>();
  cancelar = output<void>();

  // Inyección de dependencias y constantes de negocio
  private readonly fb = inject(FormBuilder);

  /**
   * Estructura reactiva del formulario de actualización
   */
  form = this.fb.group({
    estadoId: [null as number | null, Validators.required],
    observacion: ['', Validators.maxLength(255)],
  });

  constructor() {
    effect(() => {
      const med = this.medidor();
      if (med) {
        this.form.patchValue({
          estadoId: med.estado?.estadoId || null,
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
    const med = this.medidor();
    if (!med || this.isSaving()) return;

    const rawValues = this.form.getRawValue();
    this.guardar.emit({
      medidorId: med.medidorId,
      estadoId: Number(rawValues.estadoId),
      motivo: rawValues.observacion || '',
    });
  }

  /**
   * Notifica la cancelación de la edición, bloqueando el cierre si se está guardando.
   */
  close(): void {
    if (!this.isSaving()) this.cancelar.emit();
  }
}
