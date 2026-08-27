import {
  Component,
  ChangeDetectionStrategy,
  Input,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import type { LecturaFormPayload } from '../../models/work-order-form.models';
import { BaseWorkOrderFormComponent } from './base-work-order-form.component';

@Component({
  selector: 'app-lectura-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, PhotoCaptureComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="reading-form">
      <div class="form-field">
        <label for="lf-anterior" class="field-label">Lectura Anterior</label>
        <input
          id="lf-anterior"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          class="field-input readonly"
          formControlName="lecturaAnterior"
          readonly
        />
        <span class="field-hint">Último valor registrado (m³)</span>
      </div>

      <div class="form-field">
        <label for="lf-actual" class="field-label required">Lectura Actual</label>
        <input
          id="lf-actual"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          class="field-input"
          formControlName="lecturaActual"
          [class.invalid]="form.get('lecturaActual')?.touched && form.get('lecturaActual')?.invalid"
        />
        @if (form.get('lecturaActual')?.touched) {
          @if (form.get('lecturaActual')?.hasError('required')) {
            <span class="field-error">La lectura actual es obligatoria.</span>
          } @else if (form.get('lecturaActual')?.hasError('min')) {
            <span class="field-error">No se permiten valores negativos.</span>
          } @else if (form.get('lecturaActual')?.hasError('lowerThanAnterior')) {
            <span class="field-error">Debe ser mayor o igual a la lectura anterior.</span>
          }
        }
      </div>

      <div class="form-switch-field">
        <input
          type="checkbox"
          id="lf-inicial"
          formControlName="lecturaInicial"
          class="switch-input"
        />
        <label for="lf-inicial" class="switch-label">¿Es Lectura Inicial?</label>
        <span class="field-hint full-width">Ignora la validación con la lectura anterior.</span>
      </div>

      <div class="form-field">
        <label for="lf-anomalia" class="field-label">Observaciones / Anomalías</label>
        <textarea
          id="lf-anomalia"
          class="field-input field-textarea"
          rows="3"
          placeholder="Describe alguna novedad (opcional)..."
          formControlName="descripcionAnomalia"
        ></textarea>
      </div>

      <div class="form-field">
        <span class="field-label">Fotografía del Medidor</span>
        <app-photo-capture [preview]="photoPreview" (previewChange)="onPhotoChange($event)" />
        <span class="field-hint">Recomendado para anomalías o lecturas altas.</span>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" (click)="cancel()" [disabled]="isSaving">
          Cancelar
        </button>
        <button
          type="submit"
          class="btn-submit"
          [disabled]="form.invalid || isSaving"
          id="btn-submit-lectura"
        >
          @if (isSaving) {
            <span class="spinner" role="status" aria-hidden="true"></span>
            Guardando...
          } @else {
            <i class="bi bi-check-circle-fill"></i>
            Guardar Lectura
          }
        </button>
      </div>
    </form>
  `,
})
export class LecturaFormComponent
  extends BaseWorkOrderFormComponent<LecturaFormPayload>
  implements OnInit
{
  /** Lectura anterior pre-cargada por el padre desde el caché. */
  @Input() lecturaAnterior = 0;

  // Necesario porque ngOnInit debe llamar buildForm + suscribir valueChanges,
  // pero el base también implementa ngOnInit (que llama buildForm). Resolvemos
  // con takeUntilDestroyed y reescritura explícita del ciclo de vida.
  private readonly destroyRef = inject(DestroyRef);

  override ngOnInit(): void {
    super.ngOnInit();
    this.setupValidations();
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      lecturaAnterior: [{ value: this.lecturaAnterior, disabled: true }],
      lecturaActual: [0, [Validators.required, Validators.min(0)]],
      lecturaInicial: [false],
      descripcionAnomalia: [''],
    });
  }

  protected buildPayload(
    formValue: Record<string, unknown>,
    photo: string | null,
  ): LecturaFormPayload {
    return {
      tipoActividad: 'LECTURA',
      lecturaAnterior: Number(formValue['lecturaAnterior'] ?? 0),
      lecturaActual: Number(formValue['lecturaActual'] ?? 0),
      lecturaInicial: !!formValue['lecturaInicial'],
      ...(formValue['descripcionAnomalia']
        ? { descripcionAnomalia: String(formValue['descripcionAnomalia']) }
        : {}),
      ...(photo ? { fotoBase64: photo } : {}),
    };
  }

  /**
   * Validación cruzada específica del form Lectura: lecturaActual debe ser
   * >= lecturaAnterior, salvo que lecturaInicial=true. Otros forms no necesitan
   * esta lógica — se mantiene acá, no en el base.
   */
  private setupValidations(): void {
    this.form
      .get('lecturaActual')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validateCrossField());
    this.form
      .get('lecturaInicial')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validateCrossField());
  }

  private validateCrossField(): void {
    const actual = this.form.get('lecturaActual')?.value;
    const anterior = this.lecturaAnterior;
    const isInicial = this.form.get('lecturaInicial')?.value;

    const ctrl = this.form.get('lecturaActual');
    if (!ctrl) return;

    if (!isInicial && actual < anterior) {
      ctrl.setErrors({ ...ctrl.errors, lowerThanAnterior: true });
    } else {
      const errs = { ...ctrl.errors };
      delete errs['lowerThanAnterior'];
      ctrl.setErrors(Object.keys(errs).length ? errs : null);
    }
  }
}
