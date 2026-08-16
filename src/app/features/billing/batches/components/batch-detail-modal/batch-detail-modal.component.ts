import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IBatch } from '../../interfaces/ibatch.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-batch-detail-modal',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './batch-detail-modal.component.html',
  styleUrl: './batch-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchDetailModalComponent {
  readonly batch = input.required<IBatch>();
  readonly closed = output<void>();
  readonly sendEmailRequested = output<IBatch>();

  close(): void {
    this.closed.emit();
  }
}
