import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EditarEstadoMedidorPayload, EstadoMedidor, IMedidor } from '../../interfaces/imedidor.interface';

/**
 * Componente de Edición de Estado de Medidores
 * Permite la actualización del ciclo de vida de un medidor (estado) y el registro de observaciones técnicas.
 */
@Component({
  selector: 'app-editar-medidor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-medidor.component.html',
  styleUrl: './editar-medidor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarMedidorComponent implements OnChanges {
  // Entradas de datos y estado de carga
  @Input() medidor: IMedidor | null = null;
  @Input() isSaving = false;

  // Emisores de eventos para comunicación con el contenedor
  @Output() guardar = new EventEmitter<EditarEstadoMedidorPayload>();
  @Output() cancelar = new EventEmitter<void>();

  // Inyección de dependencias y constantes de negocio
  private readonly fb = inject(FormBuilder);
  readonly estados: EstadoMedidor[] = ['BODEGA', 'INSTALADO', 'DANADO', 'BAJA'];

  /**
   * Estructura reactiva del formulario de actualización
   */
  form = this.fb.group({
    estado: ['BODEGA' as EstadoMedidor, Validators.required],
    observacion: [''] 
  });

  /**
   * Hook de ciclo de vida para sincronizar los datos del medidor seleccionado
   * con los controles del formulario al abrir el modal.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medidor'] && this.medidor) {
      this.form.patchValue({
        estado: this.normalizarEstado(this.medidor.estado),
        observacion: '' 
      });
    }
  }

  /**
   * Procesa la actualización del estado y emite el payload de cambios
   * validando que exista un medidor seleccionado y no haya operaciones en curso.
   */
  submit(): void {
    if (this.form.invalid || !this.medidor || this.isSaving) return;

    const rawValues = this.form.getRawValue();
    this.guardar.emit({
      medidor: this.medidor,
      estado: rawValues.estado as EstadoMedidor,
      motivo: rawValues.observacion || ''
    });
  }

  /**
   * Notifica la cancelación de la edición, bloqueando el cierre si se está guardando.
   */
  close(): void {
    if (!this.isSaving) this.cancelar.emit();
  }

  /**
   * Garantiza que el estado recibido del medidor sea compatible con las opciones permitidas.
   * @param estado String con el estado actual del equipo.
   * @returns Un valor válido de tipo EstadoMedidor.
   */
  private normalizarEstado(estado: string): EstadoMedidor {
    return this.estados.includes(estado as EstadoMedidor) ? (estado as EstadoMedidor) : 'BODEGA';
  }

  /**
   * Transforma el identificador técnico del estado en un nombre legible para el usuario.
   * @param estado Clave técnica del estado (ej: 'DANADO').
   * @returns Nombre descriptivo (ej: 'Dañado').
   */
  getEstadoNombre(estado: string): string {
    const nombres: Record<string, string> = {
      'BODEGA': 'Disponible',
      'INSTALADO': 'Instalado',
      'DANADO': 'Dañado',
      'BAJA': 'Obsoleto'
    };
    return nombres[estado] || 'Seleccione un estado';
  }
}