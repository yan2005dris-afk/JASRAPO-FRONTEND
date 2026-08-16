import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreInvoicesService } from '../../services/pre-invoices.service';
import { IPreInvoice } from '../../interfaces/ipre-invoice.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-reject-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reject-modal.component.html',
  styleUrl: './reject-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RejectModalComponent {
  private readonly preInvoicesService = inject(PreInvoicesService);
  private readonly toastService = inject(ToastService);

  readonly preInvoice = input.required<IPreInvoice>();
  readonly confirmed = output<void>();
  readonly closed = output<void>();

  motivo = '';
  isLoading = false;

  get isValid(): boolean {
    return this.motivo.trim().length >= 5;
  }

  submitReject(): void {
    if (!this.isValid || this.isLoading) return;

    this.isLoading = true;
    this.preInvoicesService
      .updatePreInvoiceState(this.preInvoice().prefacturaId, {
        action: 'RECHAZADA',
        motivoRechazo: this.motivo.trim(),
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Prefactura rechazada', 'warning');
          this.confirmed.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al rechazar la prefactura';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
