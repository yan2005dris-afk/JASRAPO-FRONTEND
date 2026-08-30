import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import type { ReconexionFormPayload } from '../../models/work-order-form.models';
import { BaseWorkOrderFormComponent } from './base-work-order-form.component';

@Component({
  selector: 'app-reconexion-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, PhotoCaptureComponent],
  styleUrl: './work-order-forms.scss',
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="reading-form">
      <div class="form-field">
        <span class="field-label required">Confirmación de Retiro de Sello</span>
        <div class="confirmation-box">
          <i class="bi bi-shield-check"></i>
          <p>
            Confirmo que retiré el sello de seguridad del medidor antes de la reconexión. Entiendo
            que esta acción queda registrada con mi firma digital.
          </p>
        </div>
        <div class="switch-field">
          <input
            type="checkbox"
            id="rec-confirm"
            formControlName="confirmacionRetiroSello"
            class="switch-input"
          />
          <label for="rec-confirm" class="switch-label">Confirmo el retiro del sello</label>
        </div>
        @if (
          form.get('confirmacionRetiroSello')?.touched &&
          form.get('confirmacionRetiroSello')?.invalid
        ) {
          <span class="field-error">Debe confirmar el retiro del sello.</span>
        }
      </div>

      <div class="form-field">
        <span class="field-label required">Fotografía Post-Retiro</span>
        <app-photo-capture [preview]="null" (previewChange)="onPhotoChange($event)" />
        @if (submitted() && !photoPreview()) {
          <span class="field-error">La fotografía post-retiro es obligatoria.</span>
        }
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" (click)="cancel()" [disabled]="isSaving()">
          Cancelar
        </button>
        <button
          type="submit"
          class="btn-submit"
          [disabled]="form.invalid || isSaving()"
          id="btn-submit-reconexion"
        >
          @if (isSaving()) {
            <span class="spinner" role="status" aria-hidden="true"></span>
            Guardando...
          } @else {
            <i class="bi bi-check-circle-fill"></i>
            Confirmar Reconexión
          }
        </button>
      </div>
    </form>
  `,
})
export class ReconexionFormComponent extends BaseWorkOrderFormComponent<ReconexionFormPayload> {
  protected buildForm(): FormGroup {
    return this.fb.group({
      // Validador custom: el checkbox debe ser true (no solo truthy).
      confirmacionRetiroSello: [
        false,
        (control: { value: boolean }) => (control.value === true ? null : { required: true }),
      ],
    });
  }

  protected buildPayload(
    formValue: Record<string, unknown>,
    photo: Blob | null,
  ): ReconexionFormPayload {
    return {
      tipoActividad: 'RECONEXION',
      confirmacionRetiroSello: true,
      fotoBlob: photo as Blob,
    };
  }
}
