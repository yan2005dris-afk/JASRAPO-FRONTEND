import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-backoffice-context-layout',
  imports: [RouterOutlet, Sidebar, BreadcrumbComponent],
  templateUrl: './backoffice-context-layout.component.html',
  styleUrl: './backoffice-context-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeContextLayoutComponent {
  readonly layoutService = inject(LayoutService);
}
