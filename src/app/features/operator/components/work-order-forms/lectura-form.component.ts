import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import { calculateConsumo, type LecturaFormPayload } from '../../models/work-order-form.models';
import { BaseWorkOrderFormComponent } from './base-work-order-form.component';

@Component({
  selector: 'app-lectura-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, PhotoCaptureComponent],
  styleUrl: './work-order-forms.scss',
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

      <!-- Consumo Calculado Display -->
      <div class="consumption-preview-box">
        <div class="consumption-preview-header">
          <span class="consumption-title">
            <i class="bi bi-speedometer2"></i> Consumo Calculado
          </span>
          <span class="consumption-tag">Diferencia de período</span>
        </div>
        <div class="consumption-preview-main">
          <span class="consumption-val">{{ consumoCalculado() | number: '1.2-2' }}</span>
          <span class="consumption-unit">m³</span>
        </div>
        <div class="consumption-preview-formula">
          <span
            >Lectura Actual ({{ form.get('lecturaActual')?.value ?? 0 }}) - Lectura Anterior ({{
              lecturaAnterior()
            }})</span
          >
        </div>
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
        <app-photo-capture [preview]="null" (previewChange)="onPhotoChange($event)" />
        <span class="field-hint">Recomendado para anomalías o lecturas altas.</span>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" (click)="cancel()" [disabled]="isSaving()">
          Cancelar
        </button>
        <button
          type="submit"
          class="btn-submit"
          [disabled]="form.invalid || isSaving()"
          id="btn-submit-lectura"
        >
          @if (isSaving()) {
            <span class="spinner" role="status" aria-hidden="true"></span>
            Guardando...
          } @else if (initialLecturaActual() !== null) {
            <i class="bi bi-check2-all"></i>
            Verificar y Guardar
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
  readonly lecturaAnterior = input(0);

  /** Valor previo de lectura actual para verificación o re-edición. */
  readonly initialLecturaActual = input<number | null>(null);

  /** Descripción de anomalía previa si existe. */
  readonly initialDescripcionAnomalia = input<string | null>(null);

  /** Consumo calculado reactivo a partir de lecturaActual y lecturaAnterior. */
  readonly consumoCalculado = signal<number>(0);

  // Necesario porque ngOnInit debe llamar buildForm + suscribir valueChanges,
  // pero el base también implementa ngOnInit (que llama buildForm). Resolvemos
  // con takeUntilDestroyed y reescritura explícita del ciclo de vida.
  private readonly destroyRef = inject(DestroyRef);

  override ngOnInit(): void {
    super.ngOnInit();
    this.setupValidations();
    this.validateCrossField();
  }

  protected buildForm(): FormGroup {
    const defaultActual = this.initialLecturaActual() ?? 0;
    return this.fb.group({
      lecturaAnterior: [{ value: this.lecturaAnterior(), disabled: true }],
      lecturaActual: [defaultActual, [Validators.required, Validators.min(0)]],
      descripcionAnomalia: [this.initialDescripcionAnomalia() ?? ''],
    });
  }

  protected override isPhotoRequired(): boolean {
    return false;
  }

  protected buildPayload(
    formValue: Record<string, unknown>,
    photo: Blob | null,
  ): LecturaFormPayload {
    return {
      tipoActividad: 'LECTURA',
      lecturaAnterior: Number(formValue['lecturaAnterior'] ?? 0),
      lecturaActual: Number(formValue['lecturaActual'] ?? 0),
      ...(formValue['descripcionAnomalia']
        ? { descripcionAnomalia: String(formValue['descripcionAnomalia']) }
        : {}),
      ...(photo ? { fotoBlob: photo } : {}),
    };
  }

  /**
   * Validación cruzada específica del form Lectura: lecturaActual debe ser
   * >= lecturaAnterior. Otros forms no necesitan esta lógica — se mantiene acá.
   */
  private setupValidations(): void {
    this.form
      .get('lecturaActual')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validateCrossField());
  }

  private validateCrossField(): void {
    const actual = this.form.get('lecturaActual')?.value;
    const anterior = this.lecturaAnterior();

    const actualNum = Number(actual ?? 0);
    const consumo = calculateConsumo(anterior, actualNum);
    this.consumoCalculado.set(consumo);

    const ctrl = this.form.get('lecturaActual');
    if (!ctrl) return;

    if (actual < anterior) {
      ctrl.setErrors({ ...ctrl.errors, lowerThanAnterior: true });
    } else {
      const errs = { ...ctrl.errors };
      delete errs['lowerThanAnterior'];
      ctrl.setErrors(Object.keys(errs).length ? errs : null);
    }
  }
}
