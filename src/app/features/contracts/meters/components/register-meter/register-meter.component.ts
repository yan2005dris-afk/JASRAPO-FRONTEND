import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ICreateMeterPayload } from '../../interfaces/imeter.interface';

/**
 * Componente de Formulario para Registro de MetersComponent
 * Gestiona la captura de datos de nuevos equipos, validaciones reactivas y emisión de eventos de persistencia.
 */
@Component({
  selector: 'app-register-meter',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-meter.component.html',
  styleUrl: './register-meter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterMeterComponent {
  // Comunicación con el componente padre
  isSaving = input<boolean>(false);
  errorMessage = input<string>('');
  save = output<ICreateMeterPayload>();
  cancel = output<void>();

  // Inyección de dependencias para formularios reactivos
  private readonly fb = inject(FormBuilder);

  /**
   * Configuración del formulario reactivo con validaciones obligatorias
   */
  form = this.fb.nonNullable.group({
    serie: ['', [Validators.required, Validators.maxLength(50)]],
    marca: ['', [Validators.required, Validators.maxLength(50)]],
    modelo: ['', [Validators.required, Validators.maxLength(50)]],
  });

  /**
   * Gestiona el cierre del modal de registro.
   * Bloquea la acción si existe una operación de guardado en curso.
   */
  close(): void {
    if (this.isSaving()) {
      return;
    }
    this.cancel.emit();
  }

  /**
   * Valida y procesa el envío del formulario.
   * Emite el payload con los datos capturados si el formulario es válido.
   */
  submit(): void {
    if (this.isSaving()) {
      return;
    }

    this.save.emit(this.form.getRawValue());
  }
}
