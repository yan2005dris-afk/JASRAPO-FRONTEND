import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IReportContextItem, ReportStatus } from '../models/report-workspace.model';
import { ReportHeaderComponent } from '../report-header/report-header.component';
import { ReportStatusComponent } from '../report-status/report-status.component';

@Component({
  selector: 'app-report-workspace',
  imports: [ReportHeaderComponent, ReportStatusComponent],
  templateUrl: './report-workspace.component.html',
  styleUrl: './report-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportWorkspaceComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly contextItems = input<readonly IReportContextItem[]>([]);
  readonly status = input<ReportStatus>('idle');
  readonly statusMessage = input('');
  readonly showSummary = input(false);
  readonly showToolbar = input(false);
  readonly showResults = input(false);
  readonly retry = output<void>();
}
