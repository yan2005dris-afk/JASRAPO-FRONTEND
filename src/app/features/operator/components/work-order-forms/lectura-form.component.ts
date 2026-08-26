import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  DestroyRef,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import type { LecturaFormPayload } from '../../models/work-order-form.models';

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
        <app-photo-capture [preview]="photoPreview" (previewChange)="photoPreview = $event" />
        <span class="field-hint">Recomendado para anomalías o lecturas altas.</span>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" (click)="canceled.emit()" [disabled]="isSaving">
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
export class LecturaFormComponent implements OnInit {
  /* eslint-disable @angular-eslint/prefer-inject */
  constructor(
    private readonly fb: FormBuilder,
    private readonly destroyRef: DestroyRef,
  ) {}
  /* eslint-enable @angular-eslint/prefer-inject */

  @Input() lecturaAnterior = 0;
  @Input() isSaving = false;
  @Output() formSubmit = new EventEmitter<LecturaFormPayload>();
  @Output() canceled = new EventEmitter<void>();

  form!: FormGroup;
  photoPreview: string | null = null;

  ngOnInit(): void {
    this.form = this.fb.group({
      lecturaAnterior: [{ value: this.lecturaAnterior, disabled: true }],
      lecturaActual: [0, [Validators.required, Validators.min(0)]],
      lecturaInicial: [false],
      descripcionAnomalia: [''],
    });

    this.form
      .get('lecturaActual')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validateReadings());

    this.form
      .get('lecturaInicial')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validateReadings());
  }

  private validateReadings(): void {
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.formSubmit.emit({
      tipoActividad: 'LECTURA',
      lecturaAnterior: Number(v.lecturaAnterior),
      lecturaActual: Number(v.lecturaActual),
      lecturaInicial: !!v.lecturaInicial,
      ...(v.descripcionAnomalia ? { descripcionAnomalia: v.descripcionAnomalia } : {}),
      ...(this.photoPreview ? { fotoBase64: this.photoPreview } : {}),
    });
  }
}
