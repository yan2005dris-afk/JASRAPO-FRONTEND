import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaymentsService } from '../../services/payments.service';
import { IPayment } from '../../interfaces/ipayments.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { AnnulPaymentModalComponent } from '../../components/annul-payment-modal/annul-payment-modal.component';

@Component({
  selector: 'app-payment-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StatusBadgeComponent,
    AnnulPaymentModalComponent,
  ],
  templateUrl: './payment-detail.component.html',
  styleUrl: './payment-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paymentsService = inject(PaymentsService);
  private readonly cdr = inject(ChangeDetectorRef);

  pagoId = '';
  payment: IPayment | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  isAnnulModalOpen = false;
  comprobanteSignedUrl: string | null = null;
  isLoadingComprobanteUrl = false;

  ngOnInit(): void {
    this.pagoId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.pagoId) {
      this.errorMessage = 'Identificador de pago no proporcionado.';
      this.isLoading = false;
      return;
    }
    this.loadPaymentDetail();
  }

  loadPaymentDetail(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.paymentsService.getPaymentById(this.pagoId).subscribe({
      next: (payment) => {
        this.payment = payment;
        this.isLoading = false;
        if (payment.comprobanteUrl) {
          this.fetchComprobanteUrl(payment.comprobanteUrl);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading payment detail', err);
        this.errorMessage =
          err?.error?.message || 'No se pudo cargar la información del pago solicitado.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  fetchComprobanteUrl(key: string): void {
    this.isLoadingComprobanteUrl = true;
    this.paymentsService.getComprobanteUrl(key).subscribe({
      next: (res) => {
        this.comprobanteSignedUrl = res.url;
        this.isLoadingComprobanteUrl = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingComprobanteUrl = false;
        this.cdr.markForCheck();
      },
    });
  }

  getClientDisplayName(): string {
    if (!this.payment) return '—';
    if (this.payment.cliente) {
      const names = [this.payment.cliente.nombres, this.payment.cliente.apellidos]
        .filter(Boolean)
        .join(' ')
        .trim();
      return names || this.payment.cliente.razonSocial || `Cliente #${this.payment.clienteId}`;
    }
    return this.payment.clienteNombre || `Cliente #${this.payment.clienteId}`;
  }

  getClientInitials(): string {
    const name = this.getClientDisplayName();
    return name.charAt(0).toUpperCase() || 'C';
  }

  getPaymentMethodLabel(): string {
    if (!this.payment) return '—';
    if (this.payment.banco) {
      return `Transferencia Bancaria · ${this.payment.banco}`;
    }
    if (this.payment.tarjetaCredito) {
      return `Tarjeta · ${this.payment.tarjetaCredito}`;
    }
    return 'Efectivo';
  }

  getPaymentMethodBadgeClass(): string {
    if (!this.payment) return 'badge-soft-secondary';
    if (this.payment.banco) return 'badge-soft-primary';
    if (this.payment.tarjetaCredito) return 'badge-soft-warning';
    return 'badge-soft-success';
  }

  openAnnulModal(): void {
    this.isAnnulModalOpen = true;
  }

  closeAnnulModal(): void {
    this.isAnnulModalOpen = false;
    this.cdr.markForCheck();
  }

  onPaymentAnnulled(): void {
    this.isAnnulModalOpen = false;
    this.loadPaymentDetail();
  }

  isImageComprobante(): boolean {
    if (!this.payment?.comprobanteUrl) return false;
    const url = this.payment.comprobanteUrl.toLowerCase();
    return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.webp');
  }

  isPdfComprobante(): boolean {
    if (!this.payment?.comprobanteUrl) return false;
    return this.payment.comprobanteUrl.toLowerCase().endsWith('.pdf');
  }

  imprimirRecibo(): void {
    window.print();
  }
}
