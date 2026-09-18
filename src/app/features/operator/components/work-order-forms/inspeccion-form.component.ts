import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import type { InspeccionFormPayload } from '../../models/work-order-form.models';
import { BaseWorkOrderFormComponent } from './base-work-order-form.component';

@Component({
  selector: 'app-inspeccion-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, PhotoCaptureComponent],
  styleUrl: './work-order-forms.scss',
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="reading-form">
      <div class="form-field">
        <label for="insp-obs" class="field-label">Observaciones</label>
        <textarea
          id="insp-obs"
          class="field-input field-textarea"
          rows="3"
          placeholder="Detalles de la inspección..."
          formControlName="observaciones"
        ></textarea>
      </div>

      <div class="form-field">
        <span class="field-label required">Fotografía de Evidencia</span>
        <app-photo-capture [preview]="null" (previewChange)="onPhotoChange($event)" />
        @if (submitted() && !photoPreview()) {
          <span class="field-error">La fotografía de evidencia es obligatoria.</span>
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
          id="btn-submit-inspeccion"
        >
          @if (isSaving()) {
            <span class="spinner" role="status" aria-hidden="true"></span>
            Guardando...
          } @else {
            <i class="bi bi-check-circle-fill"></i>
            Guardar Inspección
          }
        </button>
      </div>
    </form>
  `,
})
export class InspeccionFormComponent extends BaseWorkOrderFormComponent<InspeccionFormPayload> {
  protected buildForm(): FormGroup {
    return this.fb.group({
      observaciones: [''],
    });
  }

  protected buildPayload(
    formValue: Record<string, unknown>,
    photo: Blob | null,
  ): InspeccionFormPayload {
    return {
      tipoActividad: 'INSPECCION',
      ...(formValue['observaciones'] ? { observaciones: String(formValue['observaciones']) } : {}),
      fotoBlob: photo as Blob,
    };
  }
}
