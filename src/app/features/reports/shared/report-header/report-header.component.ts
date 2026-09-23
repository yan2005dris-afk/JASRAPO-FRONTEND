import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-report-header',
  templateUrl: './report-header.component.html',
  styleUrl: './report-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportHeaderComponent {
  readonly headingId = input('report-workspace-title');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
