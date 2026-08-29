import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ReportFormat } from '../models/report-workspace.model';

@Component({
  selector: 'app-report-format-tabs',
  templateUrl: './report-format-tabs.component.html',
  styleUrl: './report-format-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportFormatTabsComponent {
  readonly activeFormat = input<ReportFormat>('table');
  readonly pdfLoading = input(false);
  readonly formatChange = output<ReportFormat>();
}
