import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { DashboardStats } from '../../models/metrics.model';

@Component({
  selector: 'app-stats-summary',
  templateUrl: './stats-summary.component.html',
  styleUrl: './stats-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsSummaryComponent {
  readonly stats = input.required<DashboardStats>();
}
