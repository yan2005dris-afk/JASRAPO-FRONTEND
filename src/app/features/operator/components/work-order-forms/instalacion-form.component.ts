import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import type { InstalacionFormPayload } from '../../models/work-order-form.models';
import { BaseWorkOrderFormComponent } from './base-work-order-form.component';

@Component({
  selector: 'app-instalacion-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, PhotoCaptureComponent],
  styleUrl: './work-order-forms.scss',
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="reading-form">
      <div class="form-field">
        <label for="inst-observaciones" class="field-label">Observaciones de la Instalación</label>
        <textarea
          id="inst-observaciones"
          class="field-input"
          formControlName="observaciones"
          rows="3"
          placeholder="Describe cómo se realizó la instalación o cualquier incidencia"
        ></textarea>
      </div>

      <div class="form-field">
        <span class="field-label required">Fotografía del Medidor Instalado</span>
        <app-photo-capture [preview]="null" (previewChange)="onPhotoChange($event)" />
        @if (submitted() && !photoPreview()) {
          <span class="field-error">La foto de instalación es obligatoria.</span>
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
          id="btn-submit-instalacion"
        >
          @if (isSaving()) {
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
export class InstalacionFormComponent extends BaseWorkOrderFormComponent<InstalacionFormPayload> {
  protected buildForm(): FormGroup {
    return this.fb.group({
      observaciones: [''],
    });
  }

  protected buildPayload(
    formValue: Record<string, unknown>,
    photo: Blob | null,
  ): InstalacionFormPayload {
    const resultadoObservacion = String(formValue['observaciones'] ?? '').trim();

    return {
      tipoActividad: 'INSTALACION',
      ...(resultadoObservacion ? { resultadoObservacion } : {}),
      fotoBlob: photo as Blob,
    };
  }
}
