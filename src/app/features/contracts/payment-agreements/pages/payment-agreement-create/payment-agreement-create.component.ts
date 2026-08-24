import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentAgreementsService } from '../../services/payment-agreements.service';
import {
  ICreateAgreementDto,
  IDebtSummary,
  ISimulatedInstallment,
} from '../../interfaces/ipayment-agreement.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../../shared/components/table-skeleton/table-skeleton.component';
import { ContractsService } from '../../../service-contracts/services/contracts.service';
import type { IContract } from '../../../service-contracts/interfaces/icontract.interface';

const CONTRACT_SEARCH_DEBOUNCE_MS = 400;

type WizardStep = 1 | 2;

@Component({
  selector: 'app-payment-agreement-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerComponent,
    PaginationComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './payment-agreement-create.component.html',
  styleUrl: './payment-agreement-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentAgreementCreateComponent implements OnInit, OnDestroy {
  private readonly agreementsService = inject(PaymentAgreementsService);
  private readonly contractsService = inject(ContractsService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  currentStep: WizardStep = 1;

  // Paso 1: selección de contrato
  contractSearchTerm = '';
  contracts: IContract[] = [];
  totalContracts = 0;
  isLoadingContracts = false;
  contractsError = '';
  contractsPage = 1;
  contractsPageSize = 10;
  selectedContract: IContract | null = null;
  private contractSearchTimer: ReturnType<typeof setTimeout> | null = null;

  // Paso 2: resumen de deuda y plan de cuotas
  debtSummary: IDebtSummary | null = null;
  isSearchingDebt = false;
  searchError = '';

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

    const contratoIdParam = this.route.snapshot.queryParamMap.get('contratoId');
    if (contratoIdParam) {
      this.loadContractById(contratoIdParam);
    } else {
      this.loadContracts();
    }
  }

  ngOnDestroy(): void {
    this.clearContractSearchTimer();
  }

  formatClientName(cliente: IContract['cliente']): string {
    if (!cliente) return '-';
    if (cliente.razonSocial) {
      return cliente.razonSocial;
    }
    return `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() || '-';
  }

  private loadContractById(contratoId: string): void {
    this.isLoadingContracts = true;
    this.cdr.markForCheck();

    this.contractsService.getContractById(contratoId).subscribe({
      next: (contract) => {
        this.isLoadingContracts = false;
        if (contract) {
          this.chooseContract(contract);
        } else {
          this.loadContracts();
        }
      },
      error: () => {
        this.isLoadingContracts = false;
        this.loadContracts();
      },
    });
  }

  // ---------- Paso 1: selección de contrato ----------

  onContractSearchInput(term: string): void {
    this.contractSearchTerm = term;
    this.clearContractSearchTimer();
    this.contractSearchTimer = setTimeout(() => {
      this.contractsPage = 1;
      this.loadContracts();
    }, CONTRACT_SEARCH_DEBOUNCE_MS);
  }

  clearContractSearch(): void {
    this.contractSearchTerm = '';
    this.contractsPage = 1;
    this.loadContracts();
  }

  loadContracts(): void {
    this.clearContractSearchTimer();
    this.isLoadingContracts = true;
    this.contractsError = '';
    this.cdr.markForCheck();

    const term = this.contractSearchTerm.trim();

    this.contractsService
      .getContracts({
        search: term || undefined,
        page: this.contractsPage,
        limit: this.contractsPageSize,
      })
      .subscribe({
        next: (res) => {
          this.contracts = res.data ?? [];
          this.totalContracts = res.meta?.total ?? this.contracts.length;
          this.isLoadingContracts = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.contracts = [];
          this.totalContracts = 0;
          this.contractsError = 'No se pudieron cargar los contratos. Intente nuevamente.';
          this.isLoadingContracts = false;
          this.cdr.markForCheck();
        },
      });
  }

  onContractsPageChange(page: number): void {
    this.contractsPage = page;
    this.loadContracts();
  }

  onContractsPageSizeChange(size: number): void {
    this.contractsPageSize = size;
    this.contractsPage = 1;
    this.loadContracts();
  }

  markContract(contract: IContract): void {
    if (this.selectedContract?.contratoId === contract.contratoId) return;

    this.selectedContract = contract;
    this.debtSummary = null;
    this.searchError = '';
    this.abonoInicial = 0;
    this.cdr.markForCheck();
  }

  chooseContract(contract: IContract): void {
    this.markContract(contract);
    this.goToStep(2);
  }

  isContractSelected(contract: IContract): boolean {
    return this.selectedContract?.contratoId === contract.contratoId;
  }

  get step1Valid(): boolean {
    return this.selectedContract !== null;
  }

  // ---------- Navegación del stepper ----------

  goToStep(step: WizardStep): void {
    if (step === 2 && !this.step1Valid) return;

    this.currentStep = step;

    if (step === 2 && this.selectedContract) {
      this.loadDebtSummary(this.selectedContract.contratoId);
    }

    this.cdr.markForCheck();
  }

  backToContractSelection(): void {
    this.currentStep = 1;
    this.cdr.markForCheck();
  }

  // ---------- Paso 2: deuda y simulación ----------

  private loadDebtSummary(contratoId: string): void {
    if (this.debtSummary?.contratoId === contratoId) return;

    this.isSearchingDebt = true;
    this.searchError = '';
    this.debtSummary = null;
    this.cdr.markForCheck();

    this.agreementsService.getDebtSummary(contratoId).subscribe({
      next: (summary) => {
        this.debtSummary = summary;
        this.isSearchingDebt = false;
        if (summary.deudaTotal <= 0) {
          this.searchError = 'El contrato no registra deuda pendiente para refinanciar.';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.searchError = `No se encontró información de deuda para el contrato #${contratoId}.`;
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
    if (!this.selectedContract) return false;
    if (!this.debtSummary || this.debtSummary.deudaTotal <= 0) return false;
    if (this.numeroCuotas < 1 || this.numeroCuotas > 24) return false;
    if (this.abonoInicial < 0 || this.abonoInicial >= this.debtSummary.deudaTotal) return false;
    if (!this.fechaPrimerPago) return false;
    return true;
  }

  submit(): void {
    if (!this.isFormValid || this.isLoading || !this.selectedContract) return;

    const dto: ICreateAgreementDto = {
      contratoId: this.selectedContract.contratoId,
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
        this.router.navigate(['/app/Contratos/ConveniosDePago']);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al crear convenio de pago';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/app/Contratos/ConveniosDePago']);
  }

  private clearContractSearchTimer(): void {
    if (this.contractSearchTimer) {
      clearTimeout(this.contractSearchTimer);
      this.contractSearchTimer = null;
    }
  }
}
