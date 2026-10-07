import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import type { ReconexionFormPayload } from '../../domain/models/work-order-form.models';
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
    return this.fb.group({});
  }

  protected buildPayload(
    formValue: Record<string, unknown>,
    photo: Blob | null,
  ): ReconexionFormPayload {
    return {
      tipoActividad: 'RECONEXION',
      fotoBlob: photo as Blob,
    };
  }
}
