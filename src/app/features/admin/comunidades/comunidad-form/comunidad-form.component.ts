import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Comunidad } from '../models/comunidad.interface';

@Component({
  selector: 'app-comunidad-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comunidad-form.component.html',
  styleUrl: './comunidad-form.component.css',
})
export class ComunidadFormComponent implements OnChanges {
  @Input() comunidadAEditar: Comunidad | null = null;
  @Input() customErrors: Record<string, string> | null = null;
  @Output() formClosed = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<Omit<Comunidad, 'id'>>();

  private readonly fb = inject(FormBuilder);

  readonly comunidadForm = this.fb.group({
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
    porcentajeTasaSeguridad: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['comunidadAEditar']) {
      this.prepararFormulario();
    }
  }

  prepararFormulario(): void {
    if (this.comunidadAEditar) {
      this.comunidadForm.setValue({
        codigo: this.comunidadAEditar.codigo,
        nombre: this.comunidadAEditar.nombre,
        porcentajeTasaSeguridad: this.comunidadAEditar.porcentajeTasaSeguridad,
      });
    } else {
      this.comunidadForm.reset({ codigo: '', nombre: '', porcentajeTasaSeguridad: 0 });
    }
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
