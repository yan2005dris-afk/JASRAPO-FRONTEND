import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IPayment } from '../../interfaces/ipayments.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-payment-detail-modal',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './payment-detail-modal.component.html',
  styleUrl: './payment-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDetailModalComponent {
  readonly payment = input.required<IPayment>();
  readonly closed = output<void>();

  close(): void {
    this.closed.emit();
  }
}
