import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IReading } from '../../interfaces/ireading.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-reading-detail-modal',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './reading-detail-modal.component.html',
  styleUrl: './reading-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'close()',
  },
})
export class ReadingDetailModalComponent {
  readonly reading = input.required<IReading>();
  readonly closed = output<void>();
  readonly editRequested = output<IReading>();

  close(): void {
    this.closed.emit();
  }
}
