import { Component, inject, input, output, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Comunidad } from '../models/comunidad.interface';

@Component({
  selector: 'app-comunidad-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comunidad-form.component.html',
  styleUrl: './comunidad-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComunidadFormComponent {
  comunidadAEditar = input<Comunidad | null>(null);

  formClosed = output<void>();
  formSubmitted = output<Omit<Comunidad, 'id'>>();

  private readonly fb = inject(FormBuilder);

  readonly comunidadForm = this.fb.group({
    codigo: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    porcentajeTasaSeguridad: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  constructor() {
    effect(() => {
      const editItem = this.comunidadAEditar();
      this.prepararFormulario(editItem);
    });
  }

  prepararFormulario(comunidad: Comunidad | null): void {
    if (comunidad) {
      this.comunidadForm.setValue({
        codigo: comunidad.codigo,
        nombre: comunidad.nombre,
        porcentajeTasaSeguridad: comunidad.porcentajeTasaSeguridad,
      });
      return;
    }

    this.comunidadForm.reset({
      codigo: '',
      nombre: '',
      porcentajeTasaSeguridad: 0,
    });
  }

  onClose(): void {
    this.formClosed.emit();
  }

  onSubmit(): void {
    if (this.comunidadForm.invalid) {
      this.comunidadForm.markAllAsTouched();
      return;
    }

    this.formSubmitted.emit(this.comunidadForm.getRawValue() as Omit<Comunidad, 'id'>);
  }
}
