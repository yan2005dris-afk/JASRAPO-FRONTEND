import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IReportResultColumn, IReportResultRow } from '../models/report-workspace.model';

@Component({
  selector: 'app-report-responsive-results',
  templateUrl: './report-responsive-results.component.html',
  styleUrl: './report-responsive-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportResponsiveResultsComponent {
  readonly caption = input.required<string>();
  readonly columns = input.required<readonly IReportResultColumn[]>();
  readonly rows = input.required<readonly IReportResultRow[]>();
}
