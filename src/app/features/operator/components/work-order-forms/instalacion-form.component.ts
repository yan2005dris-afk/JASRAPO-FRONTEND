import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import type { InstalacionFormPayload } from '../../models/work-order-form.models';
import { BaseWorkOrderFormComponent } from './base-work-order-form.component';

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
        <button type="button" class="btn-cancel" (click)="cancel()" [disabled]="isSaving">
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
export class InstalacionFormComponent extends BaseWorkOrderFormComponent<InstalacionFormPayload> {
  protected buildForm(): FormGroup {
    return this.fb.group({
      nuevoSerie: ['', Validators.required],
      lecturaInicial: [0, [Validators.required, Validators.min(0)]],
    });
  }

  protected buildPayload(
    formValue: Record<string, unknown>,
    photo: string | null,
  ): InstalacionFormPayload {
    return {
      tipoActividad: 'INSTALACION',
      nuevoSerie: String(formValue['nuevoSerie'] ?? ''),
      lecturaInicial: Number(formValue['lecturaInicial'] ?? 0),
      fotoBase64: photo as string,
    };
  }
}
