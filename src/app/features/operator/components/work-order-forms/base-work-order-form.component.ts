import { Directive, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import type { WorkOrderFormPayload } from '../../models/work-order-form.models';

/**
 * Clase base abstracta para los 4 sub-forms dinámicos de operator-pwa
 * (LECTURA, INSTALACION, INSPECCION, RECONEXION).
 *
 * Centraliza:
 *  - Estado común (form, photoPreview, submitted, isSaving)
 *  - Handlers compartidos (onPhotoChange, submit, cancel)
 *  - Lifecycle (ngOnInit invoca buildForm)
 *
 * Cada concreto provee solo:
 *  - buildForm(): FormGroup con los campos específicos del tipo de actividad
 *  - buildPayload(formValue, photo): T que mapea al payload tipado
 *  - Template con los inputs/buttons específicos
 *
 * Antes de este refactor: ~540 líneas de boilerplate distribuido en 4 archivos.
 * Después: ~120 líneas en los concretos + ~100 líneas en el base.
 *
 * Razón de existir: ver ticket #262 (PR #86) review findings — "Heavy boilerplate
 * duplication across 4 forms". Centralizar cambios transversales (A11y, photo
 * handling, saving state) en un solo lugar reduce el riesgo de drift.
 */
@Directive()
export abstract class BaseWorkOrderFormComponent<T extends WorkOrderFormPayload> implements OnInit {
  protected readonly fb = inject(FormBuilder);

  /** Input que indica si el padre está guardando (deshabilita submit). */
  @Input() isSaving = false;

  /** Emite el payload tipado cuando el form pasa validación + foto presente. */
  @Output() formSubmit = new EventEmitter<T>();

  /** Emite cuando el operador cancela. */
  @Output() canceled = new EventEmitter<void>();

  /** FormGroup concreto — inicializado en ngOnInit vía buildForm(). */
  form!: FormGroup;

  /** Data URI base64 de la foto capturada (null hasta que se captura). */
  photoPreview: string | null = null;

  /**
   * Gate "submitted": se prende al primer intento de submit y dirige la visibilidad
   * de errores de campos opcionales (ej. foto obligatoria).
   * Se resetea cuando el operador carga una foto nueva (onPhotoChange).
   */
  protected submitted = false;

  ngOnInit(): void {
    this.form = this.buildForm();
  }

  /**
   * Hook concreto: cada sub-form provee su FormGroup con los campos de su tipo.
   */
  protected abstract buildForm(): FormGroup;

  /**
   * Hook concreto: cada sub-form mapea su form.value + foto a su payload tipado.
   * Garantiza discriminated union por `tipoActividad`.
   */
  protected abstract buildPayload(formValue: Record<string, unknown>, photo: string | null): T;

  /**
   * Resetea el flag `submitted` cuando el operador carga una foto nueva.
   * Sin esto, un submit fallido deja el gate prendido y la nueva foto no
   * "limpia" el error visible.
   */
  protected onPhotoChange(val: string | null): void {
    this.photoPreview = val;
    if (val) this.submitted = false;
  }

  /**
   * Handler de submit. Valida form + foto, marca como touched si falla,
   * emite el payload tipado si pasa.
   */
  submit(): void {
    this.submitted = true;
    if (this.form.invalid || !this.photoPreview) {
      this.form.markAllAsTouched();
      return;
    }
    this.formSubmit.emit(this.buildPayload(this.form.value, this.photoPreview));
  }

  /** Handler de cancel. */
  cancel(): void {
    this.canceled.emit();
  }
}
