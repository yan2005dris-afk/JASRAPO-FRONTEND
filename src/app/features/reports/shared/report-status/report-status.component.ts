import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ReportStatus } from '../models/report-workspace.model';

@Component({
  selector: 'app-report-status',
  templateUrl: './report-status.component.html',
  styleUrl: './report-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportStatusComponent {
  readonly status = input<ReportStatus>('idle');
  readonly message = input('');
  readonly retryLabel = input('Reintentar');
  readonly retry = output<void>();
}
