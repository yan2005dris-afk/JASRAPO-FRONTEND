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
import { ITariffCategory, UpdateTariffRequest } from '../../interfaces/itariff.interface';
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
    descripcion: ['', Validators.required],
    valorBase: [0, [Validators.required, Validators.min(0)]],
    consumoMinimoMensual: [0, [Validators.required, Validators.min(0)]],
    valorExcedenteM3: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    const tariff = this.tariffToEdit();
    if (tariff) {
      this.tariffForm.patchValue({
        nombre: tariff.nombre,
        descripcion: tariff.descripcion ?? '',
        valorBase: tariff.valorBase,
        consumoMinimoMensual: tariff.consumoMinimoMensual,
        valorExcedenteM3: tariff.valorExcedenteM3,
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
    if (tariff?.categoriaTarifaId === undefined) {
      this.errorMessage = 'No se encontró el ID de la tarifa a actualizar.';
      return;
    }

    this.saveTariff(tariff.categoriaTarifaId);
  }

  private saveTariff(id: number): void {
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
