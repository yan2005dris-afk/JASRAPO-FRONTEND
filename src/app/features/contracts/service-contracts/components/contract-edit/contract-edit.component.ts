import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ContractsService } from '../../services/contracts.service';
import {
  IContract,
  IContractState,
  IUpdateContractRequest,
} from '../../interfaces/icontract.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

/**
 * Modal para editar un contrato: cambia el estado y la dirección de suministro.
 * Los estados se cargan del catálogo del backend (entrada `states`).
 */
@Component({
  selector: 'app-contract-edit',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contract-edit.component.html',
  styleUrl: './contract-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contractsService = inject(ContractsService);
  private readonly toast = inject(ToastService);

  readonly contract = input.required<IContract>();
  readonly states = input<IContractState[]>([]);

  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly isSaving = signal(false);

  readonly form: FormGroup = this.fb.group({
    estado: ['', Validators.required],
    direccionSuministro: ['', Validators.required],
  });

  ngOnInit(): void {
    const contract = this.contract();
    this.form.patchValue({
      estado: contract.estado,
      direccionSuministro: contract.direccionSuministro,
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const payload: IUpdateContractRequest = {
      estado: value.estado,
      direccionSuministro: value.direccionSuministro,
    };

    this.isSaving.set(true);
    this.contractsService.updateContract(this.contract().contratoId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.success('Contrato actualizado correctamente', 'Éxito');
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.message ?? 'No se pudo actualizar el contrato.';
        this.toast.error(msg, 'Error');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
