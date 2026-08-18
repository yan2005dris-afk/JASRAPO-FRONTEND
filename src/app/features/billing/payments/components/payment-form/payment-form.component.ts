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
import { PaymentsService } from '../../services/payments.service';
import { IClient } from '../../../../contracts/clients/interfaces/iclients.interface';
import { PreInvoicesService } from '../../../pre-invoices/services/pre-invoices.service';
import { IPreInvoice } from '../../../pre-invoices/interfaces/ipre-invoice.interface';
import {
  Banco,
  IBankOption,
  ICardBrandOption,
  ICreatePaymentDetailDto,
  ICreatePaymentDto,
  ISaldoFavor,
  TarjetaCredito,
  TipoDetallePago,
} from '../../interfaces/ipayments.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ContractPickerComponent } from '../../../../../shared/components/contract-picker/contract-picker.component';
import { CobroPuntualModalComponent } from '../cobro-puntual-modal/cobro-puntual-modal.component';
import type { IContract } from '../../../../contracts/service-contracts/interfaces/icontract.interface';

const NON_COLLECTABLE_STATES = ['PAGADA', 'ANULADA', 'RECHAZADA'];

type MetodoPagoUI = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ContractPickerComponent, CobroPuntualModalComponent],
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentFormComponent implements OnInit {
  private readonly paymentsService = inject(PaymentsService);
  private readonly preInvoicesService = inject(PreInvoicesService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Contract picker modal
  isPickerOpen = false;
  isLoading = false;

  // Mode
  pagoMode: 'DEUDA' | 'PUNTUAL' = 'DEUDA';
  isCobroPuntualOpen = false;

  // Selected contract and its embedded client
  selectedContract: IContract | null = null;
  selectedClient: IClient | null = null;

  // Pending account statement
  pendingPreInvoices: IPreInvoice[] = [];
  selectedPreInvoiceIds = new Set<number>();
  isLoadingPreInvoices = false;

  // Billing data suggestion
  usarConsumidorFinal = false;

  // Catalogs
  banks: IBankOption[] = [];
  cards: ICardBrandOption[] = [];
  clientSaldos: ISaldoFavor[] = [];
  aplicarSaldoFavor = false;

  // Form Fields
  metodoPago: MetodoPagoUI = 'EFECTIVO';
  bancoSeleccionado: Banco | '' = '';
  tarjetaSeleccionada: TarjetaCredito | '' = '';
  numeroOperacion = '';
  referenciaBanco = '';
  fechaPago = new Date().toISOString().split('T')[0];
  montoRecibido = 0;
  observaciones = '';

  // Detalle
  tipoDetalle: TipoDetallePago = 'PAGO_LIBRE';
  comprobanteId = '';
  cuotaConvenioId = '';

  ngOnInit(): void {
    this.loadCatalogs();
  }


  private loadCatalogs(): void {
    this.paymentsService.getBanks().subscribe({
      next: (b) => {
        this.banks = b;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading banks catalog', err);
      },
    });

    this.paymentsService.getCards().subscribe({
      next: (c) => {
        this.cards = c;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading cards catalog', err);
      },
    });
  }

  openPicker(): void {
    this.isPickerOpen = true;
    this.cdr.markForCheck();
  }

  onContractSelected(contract: IContract): void {
    this.isPickerOpen = false;
    this.selectedContract = contract;
    const client = contract.cliente as IClient;
    this.selectedClient = client;
    this.usarConsumidorFinal = false;
    this.loadPendingPreInvoices();

    const clientId = client.clienteId ?? client.id;
    if (clientId) {
      this.paymentsService.getSaldoFavorByCliente(clientId).subscribe({
        next: (saldos) => {
          this.clientSaldos = saldos.filter((s) => s.montoDisponible > 0);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading saldo a favor', err);
          this.clientSaldos = [];
          this.cdr.markForCheck();
        },
      });
    }
    this.cdr.markForCheck();
  }

  clearSelectedContract(): void {
    this.selectedContract = null;
    this.selectedClient = null;
    this.clientSaldos = [];
    this.aplicarSaldoFavor = false;
    this.pendingPreInvoices = [];
    this.selectedPreInvoiceIds = new Set<number>();
    this.isLoadingPreInvoices = false;
    this.usarConsumidorFinal = false;
    this.cdr.markForCheck();
  }


  private loadPendingPreInvoices(): void {
    if (!this.selectedContract) return;
    this.isLoadingPreInvoices = true;
    this.selectedPreInvoiceIds = new Set<number>();
    this.preInvoicesService
      .getPreInvoices({ contratoId: String(this.selectedContract.contratoId), limit: 50 })
      .subscribe({
        next: (res) => {
          this.pendingPreInvoices = (res.data || []).filter(
            (pi) => !NON_COLLECTABLE_STATES.includes(pi.estado),
          );
          // Auto-select all by default
          this.selectedPreInvoiceIds = new Set(this.pendingPreInvoices.map((pi) => pi.prefacturaId));
          this.isLoadingPreInvoices = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading pending pre-invoices', err);
          this.pendingPreInvoices = [];
          this.isLoadingPreInvoices = false;
          this.cdr.markForCheck();
        },
      });
  }

  isPreInvoiceSelected(id: number): boolean {
    return this.selectedPreInvoiceIds.has(id);
  }

  togglePreInvoice(id: number): void {
    if (this.selectedPreInvoiceIds.has(id)) {
      this.selectedPreInvoiceIds.delete(id);
    } else {
      this.selectedPreInvoiceIds.add(id);
    }
    this.selectedPreInvoiceIds = new Set(this.selectedPreInvoiceIds); // trigger change detection
    this.cdr.markForCheck();
  }

  get allPreInvoicesSelected(): boolean {
    return (
      this.pendingPreInvoices.length > 0 &&
      this.pendingPreInvoices.every((pi) => this.selectedPreInvoiceIds.has(pi.prefacturaId))
    );
  }

  toggleAllPreInvoices(): void {
    if (this.allPreInvoicesSelected) {
      this.selectedPreInvoiceIds = new Set<number>();
    } else {
      this.selectedPreInvoiceIds = new Set(this.pendingPreInvoices.map((pi) => pi.prefacturaId));
    }
    this.cdr.markForCheck();
  }

  get totalSaldoFavorDisponible(): number {
    return this.clientSaldos.reduce((acc, s) => acc + (Number(s.montoDisponible) || 0), 0);
  }

  get totalAPagarPendiente(): number {
    return this.pendingPreInvoices
      .filter((pi) => this.selectedPreInvoiceIds.has(pi.prefacturaId))
      .reduce((acc, pi) => acc + (Number(pi.totalPagar) || 0), 0);
  }

  getClientDisplayName(client: IClient): string {
    if (client.razonSocial) return client.razonSocial;
    if (client.nombres && client.apellidos) {
      return `${client.apellidos} ${client.nombres}`;
    }
    return client.nombres || client.apellidos || client.identificacion || 'Cliente';
  }

  get hasIncompleteBillingData(): boolean {
    const client = this.selectedClient;
    if (!client) return false;

    const missingEmail = !client.email || !client.email.trim();
    const missingAddress = !client.direccionDomicilio || !client.direccionDomicilio.trim();
    const missingRazonSocial =
      this.isLegalEntity(client) && (!client.razonSocial || !client.razonSocial.trim());

    return missingEmail || missingAddress || missingRazonSocial;
  }

  private isLegalEntity(client: IClient): boolean {
    const tipo = client.tipoIdentificacion;
    if (!tipo) return false;
    if (typeof tipo === 'string') return tipo.toUpperCase() === 'RUC';
    return tipo.codigo?.toUpperCase() === 'RUC';
  }

  setUsarConsumidorFinal(use: boolean): void {
    this.usarConsumidorFinal = use;
    this.cdr.markForCheck();
  }

  getPeriodLabel(pre: IPreInvoice): string {
    const created = pre.createdAt ? new Date(pre.createdAt) : null;
    if (created && !Number.isNaN(created.getTime())) {
      return created.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
    }
    return pre.periodoId != null ? `Período #${pre.periodoId}` : 'Período actual';
  }

  getPreInvoiceStateLabel(state: string): string {
    const labels: Record<string, string> = {
      GENERADA: 'Generada',
      EN_REVISION: 'En Revisión',
      APROBADA: 'Aprobada',
    };
    return labels[state] || state;
  }

  getPreInvoiceStateTone(state: string): string {
    if (state === 'EN_REVISION') return 'badge-soft-warning';
    if (state === 'APROBADA') return 'badge-soft-info';
    return 'badge-soft-success';
  }

  setMetodoPago(metodo: MetodoPagoUI): void {
    this.metodoPago = metodo;
    if (metodo === 'EFECTIVO') {
      this.bancoSeleccionado = '';
      this.tarjetaSeleccionada = '';
    } else if (metodo === 'TRANSFERENCIA') {
      this.tarjetaSeleccionada = '';
      if (!this.bancoSeleccionado && this.banks.length > 0) {
        this.bancoSeleccionado = this.banks[0].codigo as Banco;
      }
    } else if (metodo === 'TARJETA') {
      this.bancoSeleccionado = '';
      if (!this.tarjetaSeleccionada && this.cards.length > 0) {
        this.tarjetaSeleccionada = this.cards[0].codigo as TarjetaCredito;
      }
    }
    this.cdr.markForCheck();
  }

  get isFormValid(): boolean {
    if (!this.selectedClient) return false;
    if (!this.fechaPago) return false;
    if (!this.montoRecibido || this.montoRecibido <= 0) return false;

    if (this.metodoPago === 'TRANSFERENCIA') {
      if (!this.bancoSeleccionado) return false;
    }
    if (this.metodoPago === 'TARJETA') {
      if (!this.tarjetaSeleccionada) return false;
    }

    return true;
  }

  submitPayment(): void {
    if (!this.isFormValid || !this.selectedClient) return;

    const clientId = String(this.selectedClient.clienteId ?? this.selectedClient.id ?? '');

    const detalleItem: ICreatePaymentDetailDto = {
      tipoPago: this.tipoDetalle,
      montoAbonado: Number(this.montoRecibido),
      formaPagoId:
        this.metodoPago === 'EFECTIVO' ? 1 : this.metodoPago === 'TRANSFERENCIA' ? 20 : 19,
      referencia: this.referenciaBanco || this.numeroOperacion || undefined,
      fechaTransaccion: this.fechaPago,
    };

    if (this.comprobanteId) {
      detalleItem.comprobanteId = this.comprobanteId;
      detalleItem.tipoPago = 'COMPROBANTE';
    } else if (this.cuotaConvenioId) {
      detalleItem.cuotaConvenioId = this.cuotaConvenioId;
      detalleItem.tipoPago = 'CUOTA_CONVENIO';
    }

    const payload: ICreatePaymentDto = {
      clienteId: clientId,
      fechaPago: this.fechaPago,
      montoTotalRecibido: Number(this.montoRecibido),
      observaciones: this.observaciones || undefined,
      numeroOperacion: this.numeroOperacion || undefined,
      referenciaBanco: this.referenciaBanco || undefined,
      detalle: [detalleItem],
    };

    if (this.metodoPago === 'TRANSFERENCIA' && this.bancoSeleccionado) {
      payload.banco = this.bancoSeleccionado;
    } else if (this.metodoPago === 'TARJETA' && this.tarjetaSeleccionada) {
      payload.tarjetaCredito = this.tarjetaSeleccionada;
    }

    this.isLoading = true;
    this.paymentsService.createPayment(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show('Pago registrado exitosamente', 'success');
        this.router.navigate(['/app', 'Facturacion', 'RecaudacionYPagos']);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al registrar el pago';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  openCobroPuntual(): void {
    this.isCobroPuntualOpen = true;
    this.cdr.markForCheck();
  }

  onCobroPuntualCreated(event: { pagoId: number }): void {
    this.isCobroPuntualOpen = false;
    this.toastService.show('Cobro puntual registrado exitosamente', 'success');
    this.router.navigate(['/app', 'Facturacion', 'RecaudacionYPagos']);
  }

  requestAgreement(): void {
    this.router.navigate(['/app', 'Contratos', 'ConveniosDePago']);
  }

  close(): void {
    this.router.navigate(['/app', 'Facturacion', 'RecaudacionYPagos']);
  }
}
