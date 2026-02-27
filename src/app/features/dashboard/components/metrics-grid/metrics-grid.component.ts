import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MetricCardComponent } from '../metric-card/metric-card.component';
import { MetricCard } from '../../models/metrics.model';

@Component({
  selector: 'app-metrics-grid',
  imports: [MetricCardComponent],
  templateUrl: './metrics-grid.component.html',
  styleUrl: './metrics-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsGridComponent {
  readonly metrics = input.required<MetricCard[]>();
}
