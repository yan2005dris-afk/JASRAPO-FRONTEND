import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CrearMedidorPayload } from '../../interfaces/imedidor.interface';

/**
 * Componente de Formulario para Registro de Medidores
 * Gestiona la captura de datos de nuevos equipos, validaciones reactivas y emisión de eventos de persistencia.
 */
@Component({
  selector: 'app-registrar-medidor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registrar-medidor.component.html',
  styleUrl: './registrar-medidor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarMedidorComponent {
  // Comunicación con el componente padre
  @Input() isSaving = false;
  @Input() errorMessage = '';
  @Output() guardar = new EventEmitter<CrearMedidorPayload>();
  @Output() cancelar = new EventEmitter<void>();

  // Inyección de dependencias para formularios reactivos
  private readonly fb = inject(FormBuilder);

  /**
   * Configuración del formulario reactivo con validaciones obligatorias
   */
  form = this.fb.nonNullable.group({
    serie: [''],
    marca: [''],
    modelo: [''],
  });

  /**
   * Gestiona el cierre del modal de registro.
   * Bloquea la acción si existe una operación de guardado en curso.
   */
  close(): void {
    if (this.isSaving) {
      return;
    }
    this.cancelar.emit();
  }

  /**
   * Valida y procesa el envío del formulario.
   * Emite el payload con los datos capturados si el formulario es válido.
   */
  submit(): void {
    if (this.isSaving) {
      return;
    }

    this.guardar.emit(this.form.getRawValue());
  }
}
