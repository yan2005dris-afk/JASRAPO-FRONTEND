import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { TariffsService } from '../../services/tariffs.service';
import { ITariffCategory, UpdateTariffRequest } from '../../domain/models/tariff.model';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-tariffs-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tariffs-form.component.html',
  styleUrl: './tariffs-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TariffsFormComponent implements OnInit {
  readonly tariffToEdit = input<ITariffCategory | null>(null);

  readonly formClosed = output<void>();
  readonly formSubmitted = output<void>();

  private readonly tariffsService = inject(TariffsService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  isSaving = false;
  errorMessage = '';

  tariffForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    consumoMinimoMensual: [10, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    const tariff = this.tariffToEdit();
    if (tariff) {
      this.tariffForm.patchValue({
        nombre: tariff.nombre,
        descripcion: tariff.descripcion ?? '',
        consumoMinimoMensual: tariff.consumoMinimoMensual ?? 10,
      });
    }
  }

  onClose(): void {
    this.formClosed.emit();
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (this.tariffForm.invalid) {
      this.tariffForm.markAllAsTouched();
      this.errorMessage = 'Revise los campos obligatorios antes de guardar.';
      return;
    }

    const tariff = this.tariffToEdit();
    if (tariff?.categoriaTarifaId !== undefined) {
      this.updateTariff(tariff.categoriaTarifaId);
    } else {
      this.createTariff();
    }
  }

  private createTariff(): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    const payload = this.tariffForm.getRawValue();

    this.tariffsService.createTariff(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success('Tarifa creada correctamente', 'Éxito');
        this.formSubmitted.emit();
        this.onClose();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.toast.error(err.error?.message ?? 'No se pudo crear la tarifa.', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  private updateTariff(id: number): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    const payload: UpdateTariffRequest = this.tariffForm.getRawValue();

    this.tariffsService.updateTariff(id, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success('Tarifa actualizada correctamente', 'Éxito');
        this.formSubmitted.emit();
        this.onClose();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.toast.error(err.error?.message ?? 'No se pudo actualizar la tarifa.', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.tariffForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
