import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MetricCard } from '../../models/metrics.model';

@Component({
  selector: 'app-metric-card',
  templateUrl: './metric-card.component.html',
  styleUrl: './metric-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  readonly card = input.required<MetricCard>();
}
