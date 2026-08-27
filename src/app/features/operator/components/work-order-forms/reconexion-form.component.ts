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
import type { ReconexionFormPayload } from '../../models/work-order-form.models';

@Component({
  selector: 'app-reconexion-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, PhotoCaptureComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="reading-form">
      <div class="form-field">
        <div class="alert-info" role="note" aria-label="Instrucción de reconexión">
          <i class="bi bi-info-circle-fill"></i>
          Antes de reconectar, confirme que el sello anterior fue retirado correctamente.
        </div>
      </div>

      <div class="form-switch-field">
        <input
          type="checkbox"
          id="rec-confirmacion"
          formControlName="confirmacionRetiroSello"
          class="switch-input"
        />
        <label for="rec-confirmacion" class="switch-label">
          Confirmo que el sello fue retirado
        </label>
        @if (
          form.get('confirmacionRetiroSello')?.touched &&
          form.get('confirmacionRetiroSello')?.hasError('required')
        ) {
          <span class="field-error full-width"
            >Debe confirmar el retiro del sello para continuar.</span
          >
        }
      </div>

      <div class="form-field">
        <span class="field-label required">Fotografía del Sello Retirado</span>
        <app-photo-capture [preview]="photoPreview" (previewChange)="onPhotoChange($event)" />
        @if (submitted && !photoPreview) {
          <span class="field-error">La fotografía del sello retirado es obligatoria.</span>
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
          id="btn-submit-reconexion"
        >
          @if (isSaving) {
            <span class="spinner" role="status" aria-hidden="true"></span>
            Guardando...
          } @else {
            <i class="bi bi-plug-fill"></i>
            Confirmar Reconexión
          }
        </button>
      </div>
    </form>
  `,
})
export class ReconexionFormComponent implements OnInit {
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private readonly fb: FormBuilder) {}

  @Input() isSaving = false;
  @Output() formSubmit = new EventEmitter<ReconexionFormPayload>();
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
      confirmacionRetiroSello: [false, Validators.requiredTrue],
    });
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid || !this.photoPreview) {
      this.form.markAllAsTouched();
      return;
    }
    this.formSubmit.emit({
      tipoActividad: 'RECONEXION',
      confirmacionRetiroSello: true,
      fotoBase64: this.photoPreview,
    });
  }
}
