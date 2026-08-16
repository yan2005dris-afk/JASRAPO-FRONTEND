import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IPreInvoice } from '../../interfaces/ipre-invoice.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-pre-invoice-detail-modal',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './pre-invoice-detail-modal.component.html',
  styleUrl: './pre-invoice-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreInvoiceDetailModalComponent {
  readonly preInvoice = input.required<IPreInvoice>();
  readonly closed = output<void>();
  readonly approveRequested = output<IPreInvoice>();
  readonly rejectRequested = output<IPreInvoice>();
  readonly pdfRequested = output<IPreInvoice>();
  readonly emailRequested = output<IPreInvoice>();

  close(): void {
    this.closed.emit();
  }
}
