import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
  selector: 'app-send-email-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-email-modal.component.html',
  styleUrl: './send-email-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendEmailModalComponent implements OnInit {
  private readonly preInvoicesService = inject(PreInvoicesService);
  private readonly toastService = inject(ToastService);

  readonly preInvoice = input.required<IPreInvoice>();
  readonly sent = output<void>();
  readonly closed = output<void>();

  destinatario = '';
  isLoading = false;

  ngOnInit(): void {
    this.destinatario = this.preInvoice().clienteEmail || '';
  }

  get isEmailValid(): boolean {
    if (!this.destinatario.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.destinatario.trim());
  }

  sendEmail(): void {
    if (!this.isEmailValid || this.isLoading) return;

    this.isLoading = true;
    this.preInvoicesService.sendPreInvoiceEmail(this.preInvoice().prefacturaId).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.toastService.show(res.message || 'Planilla enviada por correo exitosamente', 'success');
        this.sent.emit();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al enviar la planilla por correo';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
