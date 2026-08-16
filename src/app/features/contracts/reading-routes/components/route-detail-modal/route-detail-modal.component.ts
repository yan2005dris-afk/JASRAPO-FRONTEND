import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IReadingRoute } from '../../interfaces/ireading-route.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-route-detail-modal',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './route-detail-modal.component.html',
  styleUrl: './route-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteDetailModalComponent {
  readonly route = input.required<IReadingRoute>();
  readonly closed = output<void>();
  readonly editRequested = output<IReadingRoute>();
  readonly reassignRequested = output<IReadingRoute>();

  close(): void {
    this.closed.emit();
  }
}
