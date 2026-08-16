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
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { PaymentsService } from '../../services/payments.service';
import { ClientsService } from '../../../../contracts/clients/services/clients.service';
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

const NON_COLLECTABLE_STATES = ['PAGADA', 'ANULADA', 'RECHAZADA'];

type MetodoPagoUI = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentFormComponent implements OnInit {
  private readonly paymentsService = inject(PaymentsService);
  private readonly clientsService = inject(ClientsService);
  private readonly preInvoicesService = inject(PreInvoicesService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly saved = output<void>();
  readonly closed = output<void>();

  // State
  isLoading = false;
  isSearchingClient = false;
  clientSearchResults: IClient[] = [];
  selectedClient: IClient | null = null;
  clientSearchQuery = '';
  private searchSubject = new Subject<string>();

  // Pending account statement
  pendingPreInvoices: IPreInvoice[] = [];
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
    this.setupClientSearch();
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

  private setupClientSearch(): void {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((term) => {
      if (!term || term.trim().length < 2) {
        this.clientSearchResults = [];
        this.isSearchingClient = false;
        this.cdr.markForCheck();
        return;
      }

      this.isSearchingClient = true;
      this.cdr.markForCheck();

      const isNumeric = /^\d+$/.test(term.trim());
      const params = isNumeric
        ? { identificacion: term.trim(), limit: 6 }
        : { nombreCompleto: term.trim(), limit: 6 };

      this.clientsService.searchClients(params).subscribe({
        next: (res) => {
          this.clientSearchResults = res.data;
          this.isSearchingClient = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error searching clients', err);
          this.clientSearchResults = [];
          this.isSearchingClient = false;
          this.cdr.markForCheck();
        },
      });
    });
  }

  onClientSearchInput(term: string): void {
    this.searchSubject.next(term);
  }

  selectClient(client: IClient): void {
    this.selectedClient = client;
    this.clientSearchQuery = this.getClientDisplayName(client);
    this.clientSearchResults = [];
    this.usarConsumidorFinal = false;
    this.loadPendingPreInvoices(client);

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

  clearSelectedClient(): void {
    this.selectedClient = null;
    this.clientSearchQuery = '';
    this.clientSaldos = [];
    this.aplicarSaldoFavor = false;
    this.pendingPreInvoices = [];
    this.isLoadingPreInvoices = false;
    this.usarConsumidorFinal = false;
    this.cdr.markForCheck();
  }

  private loadPendingPreInvoices(client: IClient): void {
    this.isLoadingPreInvoices = true;
    this.preInvoicesService
      .getPreInvoices({ identificacion: client.identificacion, limit: 50 })
      .subscribe({
        next: (res) => {
          this.pendingPreInvoices = (res.data || []).filter(
            (pi) => !NON_COLLECTABLE_STATES.includes(pi.estado),
          );
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

  getClientDisplayName(client: IClient): string {
    if (client.razonSocial) return client.razonSocial;
    if (client.nombres && client.apellidos) {
      return `${client.apellidos} ${client.nombres}`;
    }
    return client.nombres || client.apellidos || client.identificacion || 'Cliente';
  }

  get totalSaldoFavorDisponible(): number {
    return this.clientSaldos.reduce((acc, s) => acc + (Number(s.montoDisponible) || 0), 0);
  }

  get totalAPagarPendiente(): number {
    return this.pendingPreInvoices.reduce((acc, pi) => acc + (Number(pi.totalPagar) || 0), 0);
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
    if (pre.periodoId != null) return `Período #${pre.periodoId}`;
    const created = pre.createdAt ? new Date(pre.createdAt) : null;
    if (created && !Number.isNaN(created.getTime())) {
      return created.toLocaleDateString('es-EC', { month: 'short', year: 'numeric' });
    }
    return 'Período actual';
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
        this.saved.emit();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al registrar el pago';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  requestAgreement(): void {
    this.router.navigate(['/app', 'Contratos', 'ConveniosDePago']);
    this.closed.emit();
  }

  close(): void {
    this.closed.emit();
  }
}
