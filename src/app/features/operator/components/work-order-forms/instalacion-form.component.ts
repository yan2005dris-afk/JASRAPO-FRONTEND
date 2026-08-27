import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import type { InstalacionFormPayload } from '../../models/work-order-form.models';

@Component({
  selector: 'app-instalacion-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, PhotoCaptureComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="reading-form">
      <div class="form-field">
        <label for="inst-serie" class="field-label required">Serie del Nuevo Medidor</label>
        <input
          id="inst-serie"
          type="text"
          class="field-input"
          formControlName="nuevoSerie"
          placeholder="Ej: MED-20240001"
          [class.invalid]="form.get('nuevoSerie')?.touched && form.get('nuevoSerie')?.invalid"
        />
        @if (form.get('nuevoSerie')?.touched && form.get('nuevoSerie')?.hasError('required')) {
          <span class="field-error">El número de serie es obligatorio.</span>
        }
      </div>

      <div class="form-field">
        <label for="inst-lectura" class="field-label required">Lectura Inicial (m³)</label>
        <input
          id="inst-lectura"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          class="field-input"
          formControlName="lecturaInicial"
          [class.invalid]="
            form.get('lecturaInicial')?.touched && form.get('lecturaInicial')?.invalid
          "
        />
        @if (
          form.get('lecturaInicial')?.touched && form.get('lecturaInicial')?.hasError('required')
        ) {
          <span class="field-error">La lectura inicial es obligatoria.</span>
        }
        @if (form.get('lecturaInicial')?.touched && form.get('lecturaInicial')?.hasError('min')) {
          <span class="field-error">No se permiten valores negativos.</span>
        }
      </div>

      <div class="form-field">
        <span class="field-label required">Fotografía del Medidor Instalado</span>
        <app-photo-capture [preview]="photoPreview" (previewChange)="onPhotoChange($event)" />
        @if (submitted && !photoPreview) {
          <span class="field-error">La foto de instalación es obligatoria.</span>
        }
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" (click)="canceled.emit()" [disabled]="isSaving">
          Cancelar
        </button>
        <button
          type="submit"
          class="btn-submit"
          [disabled]="form.invalid || isSaving"
          id="btn-submit-instalacion"
        >
          @if (isSaving) {
            <span class="spinner" role="status" aria-hidden="true"></span>
            Guardando...
          } @else {
            <i class="bi bi-check-circle-fill"></i>
            Confirmar Instalación
          }
        </button>
      </div>
    </form>
  `,
})
export class InstalacionFormComponent implements OnInit {
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private readonly fb: FormBuilder) {}

  @Input() isSaving = false;
  @Output() formSubmit = new EventEmitter<InstalacionFormPayload>();
  @Output() canceled = new EventEmitter<void>();

  form!: FormGroup;
  photoPreview: string | null = null;
  submitted = false;

  /**
   * Resetea el flag `submitted` cuando el operador carga una foto nueva.
   * Sin esto, si un submit fallido dejó el gate prendido y el operador luego
   * carga la foto faltante, el error seguiría visible. El reset mantiene
   * el contrato "submitted solo se enciende al hacer submit".
   */
  onPhotoChange(val: string | null): void {
    this.photoPreview = val;
    if (val) this.submitted = false;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nuevoSerie: ['', Validators.required],
      lecturaInicial: [0, [Validators.required, Validators.min(0)]],
    });
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid || !this.photoPreview) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    this.formSubmit.emit({
      tipoActividad: 'INSTALACION',
      nuevoSerie: v.nuevoSerie,
      lecturaInicial: Number(v.lecturaInicial),
      fotoBase64: this.photoPreview,
    });
  }
}
