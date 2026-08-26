import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import type { InspeccionFormPayload } from '../../models/work-order-form.models';

const ESTADO_SELLOS_OPTIONS: { value: InspeccionFormPayload['estadoSellos']; label: string }[] = [
  { value: 'INTACTO', label: 'Intacto' },
  { value: 'VIOLADO', label: 'Violado' },
  { value: 'AUSENTE', label: 'Ausente' },
];

@Component({
  selector: 'app-inspeccion-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, PhotoCaptureComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="reading-form">
      <div class="form-field">
        <label for="insp-sellos" class="field-label required">Estado de Sellos</label>
        <select
          id="insp-sellos"
          class="field-input"
          formControlName="estadoSellos"
          [class.invalid]="form.get('estadoSellos')?.touched && form.get('estadoSellos')?.invalid"
        >
          <option value="" disabled>Seleccionar...</option>
          @for (opt of selloOptions; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
        @if (form.get('estadoSellos')?.touched && form.get('estadoSellos')?.hasError('required')) {
          <span class="field-error">El estado de los sellos es obligatorio.</span>
        }
      </div>

      <div class="form-switch-field">
        <input type="checkbox" id="insp-fugas" formControlName="hayFugas" class="switch-input" />
        <label for="insp-fugas" class="switch-label">¿Se detectaron fugas?</label>
      </div>

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
        <app-photo-capture [preview]="photoPreview" (previewChange)="photoPreview = $event" />
        @if (submitted && !photoPreview) {
          <span class="field-error">La fotografía de evidencia es obligatoria.</span>
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
          id="btn-submit-inspeccion"
        >
          @if (isSaving) {
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
export class InspeccionFormComponent implements OnInit {
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private readonly fb: FormBuilder) {}

  @Input() isSaving = false;
  @Output() formSubmit = new EventEmitter<InspeccionFormPayload>();
  @Output() canceled = new EventEmitter<void>();

  readonly selloOptions = ESTADO_SELLOS_OPTIONS;

  form!: FormGroup;
  photoPreview: string | null = null;
  submitted = false;

  ngOnInit(): void {
    this.form = this.fb.group({
      estadoSellos: ['', Validators.required],
      hayFugas: [false],
      observaciones: [''],
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
      tipoActividad: 'INSPECCION',
      estadoSellos: v.estadoSellos,
      hayFugas: !!v.hayFugas,
      ...(v.observaciones ? { observaciones: v.observaciones } : {}),
      fotoBase64: this.photoPreview,
    });
  }
}
