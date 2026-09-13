import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';
import { AppContextService } from '../../core/navigation/app-context.service';

import { SyncStatusWidgetComponent } from '../sync-status-widget/sync-status-widget.component';

@Component({
  selector: 'app-header',
  imports: [RouterModule, SyncStatusWidgetComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Header {
  readonly authService = inject(AuthService);
  readonly layoutService = inject(LayoutService);
  readonly appContextService = inject(AppContextService);
  readonly router = inject(Router);
  readonly userDropdownOpen = signal(false);

  toggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }

  switchToBackoffice(): void {
    this.closeUserDropdown();
    this.appContextService.switchToContext('backoffice');
  }

  switchToOperator(): void {
    this.closeUserDropdown();
    this.appContextService.switchToContext('operator');
  }

  toggleUserDropdown(): void {
    this.userDropdownOpen.update((value) => !value);
  }

  closeUserDropdown(): void {
    this.userDropdownOpen.set(false);
  }

  logout(): void {
    this.closeUserDropdown();
    this.authService.logout();
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.dropdown');

    if (!dropdown && this.userDropdownOpen()) {
      this.closeUserDropdown();
    }
  }
}
