import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentsService } from '../../services/payments.service';
import { IPayment } from '../../interfaces/ipayments.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-annul-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annul-payment-modal.component.html',
  styleUrl: './annul-payment-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnulPaymentModalComponent {
  private readonly paymentsService = inject(PaymentsService);
  private readonly toastService = inject(ToastService);

  readonly payment = input.required<IPayment>();
  readonly confirmed = output<void>();
  readonly closed = output<void>();

  motivo = '';
  isLoading = false;

  get isValid(): boolean {
    return this.motivo.trim().length >= 5;
  }

  submitAnnul(): void {
    if (!this.isValid || this.isLoading) return;

    this.isLoading = true;
    this.paymentsService
      .annulPayment(this.payment().pagoId, { motivoAnulacion: this.motivo.trim() })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Pago anulado exitosamente', 'success');
          this.confirmed.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al anular el pago';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
