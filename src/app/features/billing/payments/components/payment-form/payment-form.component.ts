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
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';
import { RubroPickerComponent } from '../../../../../shared/components/rubro-picker/rubro-picker.component';
import type { IContract } from '../../../../contracts/service-contracts/interfaces/icontract.interface';
import type {
  ICobroPuntualItem,
  ICreateCobroPuntualDto,
  IRubro,
} from '../../interfaces/ipayments.interface';

const NON_COLLECTABLE_STATES = ['PAGADA', 'ANULADA', 'RECHAZADA'];

type MetodoPagoUI = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ContractPickerComponent,
    DatePickerComponent,
    RubroPickerComponent,
  ],
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

  // Rubro picker modal
  isRubroPickerOpen = false;

  // Mode
  pagoMode: 'DEUDA' | 'PUNTUAL' = 'DEUDA';

  // Cobro Puntual inline state
  rubrosCatalog: IRubro[] = [];
  rubrosSearchTerm = '';
  isSearchingRubros = false;
  puntualItems: ICobroPuntualItem[] = [];
  private rubroSearchTimer: ReturnType<typeof setTimeout> | null = null;

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

  // Comprobante de transferencia / depósito
  comprobanteFile: File | null = null;
  comprobantePreviewUrl: string | null = null;
  comprobanteKey: string | null = null;
  isUploadingComprobante = false;

  // Detalle
  tipoDetalle: TipoDetallePago = 'PAGO_LIBRE';
  comprobanteId = '';
  cuotaConvenioId = '';

  onComprobanteSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.toastService.show(
        'Formato no permitido. Suba una imagen JPG, PNG, WEBP o un archivo PDF.',
        'error',
      );
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.toastService.show('El comprobante no debe superar los 10MB.', 'error');
      input.value = '';
      return;
    }

    this.comprobanteFile = file;
    this.isUploadingComprobante = true;
    this.cdr.markForCheck();

    // Si es imagen, crear preview local
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.comprobantePreviewUrl = e.target?.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    } else {
      this.comprobantePreviewUrl = null;
    }

    // Subir a RustFS via backend
    this.paymentsService.uploadComprobante(file).subscribe({
      next: (res) => {
        this.comprobanteKey = res.key;
        this.isUploadingComprobante = false;
        this.toastService.show('Comprobante cargado correctamente a RustFS', 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isUploadingComprobante = false;
        const msg = err?.error?.message || 'Error al subir el comprobante a RustFS';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        this.clearComprobante();
        this.cdr.markForCheck();
      },
    });
  }

  clearComprobante(): void {
    this.comprobanteFile = null;
    this.comprobantePreviewUrl = null;
    this.comprobanteKey = null;
    this.isUploadingComprobante = false;
    this.cdr.markForCheck();
  }

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
          this.selectedPreInvoiceIds = new Set(
            this.pendingPreInvoices.map((pi) => pi.prefacturaId),
          );
          this.syncMontoFromPreInvoices();
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

  private syncMontoFromPreInvoices(): void {
    if (this.pagoMode === 'DEUDA') {
      this.montoRecibido = Number(this.totalAPagarPendiente.toFixed(2));
    }
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
    this.syncMontoFromPreInvoices();
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
    this.syncMontoFromPreInvoices();
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
    if (pre.mes === 0) {
      return 'Cargo Único — Instalación';
    }
    if (pre.periodoNombre && pre.periodoNombre.trim()) {
      return pre.periodoNombre;
    }
    const fechaRef = pre.periodoFechaInicio || pre.createdAt;
    const created = fechaRef ? new Date(fechaRef) : null;
    if (created && !Number.isNaN(created.getTime())) {
      const mesAnio = created.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
      return mesAnio.charAt(0).toUpperCase() + mesAnio.slice(1);
    }
    return pre.periodoId != null ? `Período #${pre.periodoId}` : 'Período actual';
  }

  getPreInvoiceDate(pre: IPreInvoice): string {
    const d = pre.createdAt ? new Date(pre.createdAt) : null;
    if (d && !Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return '';
  }

  getPreInvoiceConceptos(pre: IPreInvoice): string {
    if (pre.detalles && pre.detalles.length > 0) {
      return pre.detalles
        .map((d) => d.descripcion)
        .filter(Boolean)
        .join(', ');
    }
    if (pre.tarifaNombre) {
      return `Consumo de agua (${pre.tarifaNombre})`;
    }
    return 'Consumo de agua potable y servicios';
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

  setPagoMode(mode: 'DEUDA' | 'PUNTUAL'): void {
    this.pagoMode = mode;
    if (mode === 'PUNTUAL') {
      if (this.rubrosCatalog.length === 0) {
        this.loadRubros();
      }
      this.syncMontoFromPuntual();
    } else {
      this.montoRecibido = this.totalAPagarPendiente;
    }
    this.cdr.markForCheck();
  }

  loadRubros(): void {
    this.isSearchingRubros = true;
    this.cdr.markForCheck();
    this.paymentsService
      .getRubros({ activo: true, search: this.rubrosSearchTerm, limit: 50 })
      .subscribe({
        next: (res) => {
          this.rubrosCatalog = res.data || [];
          this.isSearchingRubros = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading rubros catalog', err);
          this.rubrosCatalog = [];
          this.isSearchingRubros = false;
          this.cdr.markForCheck();
        },
      });
  }

  onRubrosSearchInput(val: string): void {
    this.rubrosSearchTerm = val;
    if (this.rubroSearchTimer) clearTimeout(this.rubroSearchTimer);
    this.rubroSearchTimer = setTimeout(() => this.loadRubros(), 300);
  }

  openRubroPicker(): void {
    this.isRubroPickerOpen = true;
    this.cdr.markForCheck();
  }

  onRubroSelected(rubro: IRubro): void {
    this.isRubroPickerOpen = false;
    this.addPuntualRubro(rubro);
  }

  addPuntualRubro(rubro: IRubro): void {
    const current = this.puntualItems;
    const existingIdx = current.findIndex((i) => i.rubroId === rubro.rubroId);

    if (existingIdx >= 0) {
      this.updatePuntualCantidad(existingIdx, current[existingIdx].cantidad + 1);
    } else {
      const pIva = rubro.tarifaImpuesto ? Number(rubro.tarifaImpuesto.porcentaje) : 0;
      const subtotal = Number(rubro.precioUnitario);
      const iva = (subtotal * pIva) / 100;

      this.puntualItems = [
        ...this.puntualItems,
        {
          rubroId: rubro.rubroId,
          rubroNombre: rubro.nombre,
          descripcion: '',
          cantidad: 1,
          precioUnitario: Number(rubro.precioUnitario),
          porcentajeIva: pIva,
          subtotal,
          iva,
          total: subtotal + iva,
        },
      ];
      this.syncMontoFromPuntual();
    }
    this.cdr.markForCheck();
  }

  updatePuntualCantidad(idx: number, cantidad: number): void {
    if (cantidad < 1) cantidad = 1;
    const newItems = [...this.puntualItems];
    const item = { ...newItems[idx] };
    item.cantidad = cantidad;
    item.subtotal = item.precioUnitario * cantidad;
    item.iva = (item.subtotal * item.porcentajeIva) / 100;
    item.total = item.subtotal + item.iva;
    newItems[idx] = item;
    this.puntualItems = newItems;
    this.syncMontoFromPuntual();
    this.cdr.markForCheck();
  }

  updatePuntualDescripcion(idx: number, desc: string): void {
    const newItems = [...this.puntualItems];
    newItems[idx] = { ...newItems[idx], descripcion: desc };
    this.puntualItems = newItems;
    this.cdr.markForCheck();
  }

  removePuntualItem(idx: number): void {
    this.puntualItems = this.puntualItems.filter((_, i) => i !== idx);
    this.syncMontoFromPuntual();
    this.cdr.markForCheck();
  }

  get puntualSubtotal(): number {
    return this.puntualItems.reduce((acc, item) => acc + item.subtotal, 0);
  }

  get puntualIva(): number {
    return this.puntualItems.reduce((acc, item) => acc + item.iva, 0);
  }

  get puntualTotal(): number {
    return this.puntualItems.reduce((acc, item) => acc + item.total, 0);
  }

  private syncMontoFromPuntual(): void {
    if (this.pagoMode === 'PUNTUAL') {
      this.montoRecibido = Number(this.puntualTotal.toFixed(2));
    }
  }

  onFechaPagoChange(newDate: string): void {
    this.fechaPago = newDate;
    this.cdr.markForCheck();
  }

  get isFormValid(): boolean {
    if (!this.selectedClient) return false;
    if (!this.fechaPago) return false;
    if (!this.montoRecibido || this.montoRecibido <= 0) return false;

    if (this.pagoMode === 'PUNTUAL' && this.puntualItems.length === 0) {
      return false;
    }

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

    const rawClientId =
      this.selectedClient.clienteId ??
      (this.selectedClient as { id?: string | number }).id ??
      this.selectedContract?.clienteId ??
      '';
    const clientId = String(rawClientId).trim();

    this.isLoading = true;

    if (this.pagoMode === 'PUNTUAL') {
      if (!this.selectedContract) return;

      const puntualDto: ICreateCobroPuntualDto = {
        clienteId: clientId,
        contratoId: String(this.selectedContract.contratoId).trim(),
        fechaPago: this.fechaPago,
        items: this.puntualItems.map((i) => ({
          rubroId: Number(i.rubroId),
          cantidad: Number(i.cantidad),
          ...(i.descripcion && i.descripcion.trim() ? { descripcion: i.descripcion.trim() } : {}),
        })),
        banco:
          this.metodoPago === 'TRANSFERENCIA' && this.bancoSeleccionado
            ? this.bancoSeleccionado
            : undefined,
        tarjetaCredito:
          this.metodoPago === 'TARJETA' && this.tarjetaSeleccionada
            ? this.tarjetaSeleccionada
            : undefined,
        numeroOperacion: this.numeroOperacion?.trim() || undefined,
        referenciaBanco: this.referenciaBanco?.trim() || undefined,
        observaciones: this.observaciones?.trim() || undefined,
        comprobanteUrl:
          this.metodoPago === 'TRANSFERENCIA' && this.comprobanteKey
            ? this.comprobanteKey
            : undefined,
      };

      this.paymentsService.createCobroPuntual(puntualDto).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Cobro puntual registrado exitosamente', 'success');
          this.router.navigate(['/app', 'Facturacion', 'RecaudacionYPagos']);
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al registrar el cobro puntual';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
          this.cdr.markForCheck();
        },
      });
      return;
    }

    // Modo DEUDA
    const selectedList = this.pendingPreInvoices.filter((pi) =>
      this.selectedPreInvoiceIds.has(pi.prefacturaId),
    );

    const formaPagoId =
      this.metodoPago === 'EFECTIVO' ? 1 : this.metodoPago === 'TRANSFERENCIA' ? 20 : 19;
    const ref = this.referenciaBanco || this.numeroOperacion || undefined;

    let detalles: ICreatePaymentDetailDto[];

    if (selectedList.length > 0) {
      detalles = selectedList.map((pi) => ({
        tipoPago: pi.comprobanteId ? 'COMPROBANTE' : 'PAGO_LIBRE',
        comprobanteId: pi.comprobanteId ? String(pi.comprobanteId) : undefined,
        montoAbonado: Number(pi.totalPagar),
        formaPagoId,
        referencia: ref,
        fechaTransaccion: this.fechaPago,
      }));
    } else {
      detalles = [
        {
          tipoPago: this.comprobanteId
            ? 'COMPROBANTE'
            : this.cuotaConvenioId
              ? 'CUOTA_CONVENIO'
              : 'PAGO_LIBRE',
          comprobanteId: this.comprobanteId || undefined,
          cuotaConvenioId: this.cuotaConvenioId || undefined,
          montoAbonado: Number(this.montoRecibido),
          formaPagoId,
          referencia: ref,
          fechaTransaccion: this.fechaPago,
        },
      ];
    }

    const payload: ICreatePaymentDto = {
      clienteId: clientId,
      fechaPago: this.fechaPago,
      montoTotalRecibido: Number(this.montoRecibido),
      observaciones: this.observaciones || undefined,
      numeroOperacion: this.numeroOperacion || undefined,
      referenciaBanco: this.referenciaBanco || undefined,
      comprobanteUrl:
        this.metodoPago === 'TRANSFERENCIA' && this.comprobanteKey
          ? this.comprobanteKey
          : undefined,
      detalle: detalles,
    };

    if (this.metodoPago === 'TRANSFERENCIA' && this.bancoSeleccionado) {
      payload.banco = this.bancoSeleccionado;
    } else if (this.metodoPago === 'TARJETA' && this.tarjetaSeleccionada) {
      payload.tarjetaCredito = this.tarjetaSeleccionada;
    }

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

  requestAgreement(): void {
    this.router.navigate(['/app', 'Contratos', 'ConveniosDePago']);
  }

  close(): void {
    this.router.navigate(['/app', 'Facturacion', 'RecaudacionYPagos']);
  }
}
