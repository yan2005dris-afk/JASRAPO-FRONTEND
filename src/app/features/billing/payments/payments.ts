import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentsService } from './services/payments.service';
import {
  EstadoPago,
  IBankOption,
  ICardBrandOption,
  IFindAllPaymentsParams,
  IPayment,
  IPaymentStateOption,
} from './interfaces/ipayments.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { PaymentDetailModalComponent } from './components/payment-detail-modal/payment-detail-modal.component';
import { AnnulPaymentModalComponent } from './components/annul-payment-modal/annul-payment-modal.component';

import { ContractPickerComponent } from '../../../shared/components/contract-picker/contract-picker.component';
import { IContract } from '../../contracts/service-contracts/interfaces/icontract.interface';

type DatePreset = 'today' | 'week' | 'month' | 'custom';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    PaymentDetailModalComponent,
    AnnulPaymentModalComponent,
    ContractPickerComponent,
  ],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class PaymentsComponent implements OnInit {
  private readonly paymentsService = inject(PaymentsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  // List State
  payments: IPayment[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: string | null = null;

  // Selected Rows (Checkboxes)
  selectedPaymentIds = new Set<string>();

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  filterEstado: EstadoPago | '' = '';
  filterMetodo = '';
  filterFechaDesde = '';
  filterFechaHasta = '';
  filterClienteId = '';
  selectedFilterContract: IContract | null = null;
  isContractPickerOpen = false;
  selectedDatePreset: DatePreset = 'month';

  // Catalogs
  statesCatalog: IPaymentStateOption[] = [];
  banksCatalog: IBankOption[] = [];
  cardsCatalog: ICardBrandOption[] = [];

  // Modals
  selectedPaymentForDetail: IPayment | null = null;
  selectedPaymentForAnnul: IPayment | null = null;

  ngOnInit(): void {
    this.applyDatePreset('month', false);
    this.loadCatalogs();
    this.loadPayments();
  }

  loadCatalogs(): void {
    this.paymentsService.getPaymentStates().subscribe({
      next: (states) => {
        this.statesCatalog = states;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading payment states catalog', err);
      },
    });

    this.paymentsService.getBanks().subscribe({
      next: (banks) => {
        this.banksCatalog = banks;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading banks catalog', err);
      },
    });

    this.paymentsService.getCards().subscribe({
      next: (cards) => {
        this.cardsCatalog = cards;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading cards catalog', err);
      },
    });
  }

  loadPayments(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IFindAllPaymentsParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.filterClienteId.trim()) {
      params.clienteId = this.filterClienteId.trim();
    }
    if (this.filterEstado) {
      params.estadoPago = this.filterEstado;
    }
    if (this.filterFechaDesde) {
      params.fechaDesde = this.filterFechaDesde;
    }
    if (this.filterFechaHasta) {
      params.fechaHasta = this.filterFechaHasta;
    }

    if (this.filterMetodo.startsWith('BANCO:')) {
      params.banco = this.filterMetodo.replace('BANCO:', '');
    } else if (this.filterMetodo.startsWith('TARJETA:')) {
      params.tarjetaCredito = this.filterMetodo.replace('TARJETA:', '');
    }

    this.paymentsService.getPayments(params).subscribe({
      next: (res) => {
        this.payments = res.data;
        this.totalItems = res.meta?.totalItems ?? res.data.length;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.payments = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
    });
  }

  applyDatePreset(preset: DatePreset, reload = true): void {
    this.selectedDatePreset = preset;
    const now = new Date();

    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      this.filterFechaDesde = todayStr;
      this.filterFechaHasta = todayStr;
    } else if (preset === 'week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay() || 7;
      startOfWeek.setDate(startOfWeek.getDate() - day + 1);
      this.filterFechaDesde = startOfWeek.toISOString().split('T')[0];
      this.filterFechaHasta = now.toISOString().split('T')[0];
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      this.filterFechaDesde = firstDay.toISOString().split('T')[0];
      this.filterFechaHasta = now.toISOString().split('T')[0];
    }

    if (reload) {
      this.currentPage = 1;
      this.loadPayments();
    }
  }

  onCustomDateChange(): void {
    this.selectedDatePreset = 'custom';
  }

  onContractFilterSelected(contract: IContract): void {
    this.isContractPickerOpen = false;
    this.selectedFilterContract = contract;
    const clientId =
      contract.cliente?.clienteId ??
      (contract.cliente as { id?: string | number }).id ??
      contract.clienteId;
    this.filterClienteId = clientId ? String(clientId) : '';
    this.currentPage = 1;
    this.loadPayments();
    this.cdr.markForCheck();
  }

  clearContractFilter(): void {
    this.selectedFilterContract = null;
    this.filterClienteId = '';
    this.currentPage = 1;
    this.loadPayments();
    this.cdr.markForCheck();
  }

  // Row selection helpers
  get allPaymentsSelected(): boolean {
    return (
      this.payments.length > 0 && this.payments.every((p) => this.selectedPaymentIds.has(p.pagoId))
    );
  }

  toggleSelectAll(): void {
    if (this.allPaymentsSelected) {
      this.selectedPaymentIds.clear();
    } else {
      this.payments.forEach((p) => this.selectedPaymentIds.add(p.pagoId));
    }
    this.cdr.markForCheck();
  }

  toggleSelectPayment(pagoId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.selectedPaymentIds.has(pagoId)) {
      this.selectedPaymentIds.delete(pagoId);
    } else {
      this.selectedPaymentIds.add(pagoId);
    }
    this.cdr.markForCheck();
  }

  isPaymentSelected(pagoId: string): boolean {
    return this.selectedPaymentIds.has(pagoId);
  }

  getClientDisplayName(payment: IPayment): string {
    if (payment.cliente) {
      const names = [payment.cliente.nombres, payment.cliente.apellidos]
        .filter(Boolean)
        .join(' ')
        .trim();
      return names || payment.cliente.razonSocial || `Cliente #${payment.clienteId}`;
    }
    return payment.clienteNombre || `Cliente #${payment.clienteId}`;
  }

  getClientInitials(payment: IPayment): string {
    const name = this.getClientDisplayName(payment);
    return name.charAt(0).toUpperCase() || 'C';
  }

  limpiarFiltros(): void {
    this.filterEstado = '';
    this.filterMetodo = '';
    this.filterClienteId = '';
    this.selectedFilterContract = null;
    this.applyDatePreset('month', false);
    this.currentPage = 1;
    this.loadPayments();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadPayments();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadPayments();
  }

  toggleDropdown(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === id ? null : id;
    this.cdr.markForCheck();
  }

  closeDropdowns(): void {
    if (this.openDropdownId !== null) {
      this.openDropdownId = null;
      this.cdr.markForCheck();
    }
  }

  get totalAmountOnCurrentPage(): number {
    return this.payments.reduce((acc, p) => acc + (Number(p.montoTotalRecibido) || 0), 0);
  }

  getPaymentMethodLabel(payment: IPayment): string {
    if (payment.banco) {
      return `Transferencia · ${payment.banco}`;
    }
    if (payment.tarjetaCredito) {
      return `Tarjeta · ${payment.tarjetaCredito}`;
    }
    return 'Efectivo';
  }

  getPaymentMethodTone(payment: IPayment): 'success' | 'primary' | 'warning' {
    if (payment.banco) return 'primary';
    if (payment.tarjetaCredito) return 'warning';
    return 'success';
  }

  // Navigation & Actions
  openCreatePage(): void {
    this.router.navigate(['/app', 'Facturacion', 'RecaudacionYPagos', 'RegistrarPago']);
  }

  openDetailPage(payment: IPayment): void {
    this.openDropdownId = null;
    this.router.navigate(['/app', 'Facturacion', 'RecaudacionYPagos', payment.pagoId]);
  }

  openDetailModal(payment: IPayment): void {
    this.openDetailPage(payment);
  }

  closeDetailModal(): void {
    this.selectedPaymentForDetail = null;
    this.cdr.markForCheck();
  }

  openAnnulModal(payment: IPayment): void {
    this.openDropdownId = null;
    this.selectedPaymentForAnnul = payment;
    this.cdr.markForCheck();
  }

  closeAnnulModal(): void {
    this.selectedPaymentForAnnul = null;
    this.cdr.markForCheck();
  }

  onPaymentAnnulled(): void {
    this.selectedPaymentForAnnul = null;
    this.loadPayments();
  }
}
