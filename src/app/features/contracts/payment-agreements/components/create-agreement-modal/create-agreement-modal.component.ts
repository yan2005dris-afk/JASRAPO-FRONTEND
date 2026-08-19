import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentAgreementsService } from '../../services/payment-agreements.service';
import {
  ICreateAgreementDto,
  IDebtSummary,
  ISimulatedInstallment,
} from '../../interfaces/ipayment-agreement.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';
import { ContractsService } from '../../../service-contracts/services/contracts.service';
import type { IContract } from '../../../service-contracts/interfaces/icontract.interface';

@Component({
  selector: 'app-create-agreement-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './create-agreement-modal.component.html',
  styleUrl: './create-agreement-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAgreementModalComponent implements OnInit {
  private readonly agreementsService = inject(PaymentAgreementsService);
  private readonly contractsService = inject(ContractsService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly created = output<void>();
  readonly closed = output<void>();

  contratoIdInput = '';
  debtSummary: IDebtSummary | null = null;
  isSearchingDebt = false;
  searchError = '';

  // Contract inline autocomplete
  contractSearchQuery = '';
  contractSearchResults: IContract[] = [];
  isSearchingContracts = false;
  isAutocompleteOpen = false;
  selectedContract: IContract | null = null;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  numeroCuotas = 6;
  abonoInicial = 0;
  fechaPrimerPago = '';
  motivo = '';
  isLoading = false;

  ngOnInit(): void {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    this.fechaPrimerPago = nextMonth.toISOString().split('T')[0];
  }

  formatClientName(cliente: IContract['cliente']): string {
    if (cliente.razonSocial) {
      return cliente.razonSocial;
    }
    return `${cliente.nombres} ${cliente.apellidos}`.trim();
  }

  onContractSearchInput(query: string): void {
    this.contractSearchQuery = query;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      this.contractSearchResults = [];
      this.isAutocompleteOpen = false;
      this.cdr.markForCheck();
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.executeContractSearch(trimmed);
    }, 350);
  }

  private executeContractSearch(term: string): void {
    this.isSearchingContracts = true;
    this.isAutocompleteOpen = true;
    this.cdr.markForCheck();

    this.contractsService.getContracts({ search: term, limit: 8 }).subscribe({
      next: (res) => {
        this.contractSearchResults = res.data;
        this.isSearchingContracts = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.contractSearchResults = [];
        this.isSearchingContracts = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectContract(contract: IContract): void {
    this.selectedContract = contract;
    this.contratoIdInput = String(contract.contratoId);
    this.contractSearchQuery = `${contract.numeroGuia} - ${this.formatClientName(contract.cliente)}`;
    this.isAutocompleteOpen = false;
    this.contractSearchResults = [];
    this.cdr.markForCheck();
    this.searchDebt();
  }

  clearSelectedContract(): void {
    this.selectedContract = null;
    this.contratoIdInput = '';
    this.contractSearchQuery = '';
    this.contractSearchResults = [];
    this.isAutocompleteOpen = false;
    this.debtSummary = null;
    this.searchError = '';
    this.cdr.markForCheck();
  }

  searchDebt(): void {
    if (!this.contratoIdInput.trim()) return;

    this.isSearchingDebt = true;
    this.searchError = '';
    this.debtSummary = null;
    this.cdr.markForCheck();

    this.agreementsService.getDebtSummary(this.contratoIdInput.trim()).subscribe({
      next: (summary) => {
        this.debtSummary = summary;
        this.isSearchingDebt = false;
        if (summary.deudaTotal <= 0) {
          this.searchError = 'El contrato no registra deuda pendiente para refinanciar.';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.searchError = `No se encontró información de deuda para el contrato #${this.contratoIdInput}.`;
        this.isSearchingDebt = false;
        this.cdr.markForCheck();
      },
    });
  }

  get netFinancedDebt(): number {
    if (!this.debtSummary) return 0;
    return Math.max(0, this.debtSummary.deudaTotal - Number(this.abonoInicial || 0));
  }

  get simulatedInstallments(): ISimulatedInstallment[] {
    if (!this.debtSummary || this.netFinancedDebt <= 0 || this.numeroCuotas <= 0) return [];

    const cuotasCount = Math.max(1, Math.min(24, this.numeroCuotas));
    const cuotaBase = +(this.netFinancedDebt / cuotasCount).toFixed(2);
    const startDate = this.fechaPrimerPago
      ? new Date(this.fechaPrimerPago + 'T00:00:00')
      : new Date();

    const list: ISimulatedInstallment[] = [];
    let currentBalance = this.netFinancedDebt;

    for (let i = 1; i <= cuotasCount; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const isLast = i === cuotasCount;
      const valor = isLast ? +currentBalance.toFixed(2) : cuotaBase;
      currentBalance = Math.max(0, +(currentBalance - valor).toFixed(2));

      list.push({
        numeroCuota: i,
        fechaVencimiento: dueDate.toISOString().split('T')[0],
        valorCuota: valor,
        saldoRestante: currentBalance,
      });
    }

    return list;
  }

  get isFormValid(): boolean {
    if (!this.debtSummary || this.debtSummary.deudaTotal <= 0) return false;
    if (this.numeroCuotas < 1 || this.numeroCuotas > 24) return false;
    if (this.abonoInicial < 0 || this.abonoInicial >= this.debtSummary.deudaTotal) return false;
    if (!this.fechaPrimerPago) return false;
    return true;
  }

  submit(): void {
    if (!this.isFormValid || this.isLoading || !this.debtSummary) return;

    const dto: ICreateAgreementDto = {
      contratoId: this.contratoIdInput.trim(),
      numeroCuotas: Number(this.numeroCuotas),
      abonoInicial: Number(this.abonoInicial || 0),
      fechaPrimerPago: this.fechaPrimerPago,
      motivo: this.motivo.trim() || undefined,
    };

    this.isLoading = true;
    this.agreementsService.createAgreement(dto).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show('Convenio de pago creado exitosamente', 'success');
        this.created.emit();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al crear convenio de pago';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
