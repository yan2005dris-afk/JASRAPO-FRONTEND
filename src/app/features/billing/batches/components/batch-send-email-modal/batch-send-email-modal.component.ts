import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BatchesService } from '../../services/batches.service';
import { IBatch } from '../../interfaces/ibatch.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-batch-send-email-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './batch-send-email-modal.component.html',
  styleUrl: './batch-send-email-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchSendEmailModalComponent {
  private readonly batchesService = inject(BatchesService);
  private readonly toastService = inject(ToastService);

  readonly batch = input.required<IBatch>();
  readonly sent = output<void>();
  readonly closed = output<void>();

  isLoading = false;

  submitSendEmails(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.batchesService.sendBatchEmails(this.batch().loteId).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.toastService.show(
          res.message || 'Envío masivo de planillas encolado exitosamente',
          'success',
        );
        this.sent.emit();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al encolar el envío masivo de planillas';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
