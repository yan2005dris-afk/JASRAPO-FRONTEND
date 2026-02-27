import { Component, ChangeDetectionStrategy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header {
  readonly authService = inject(AuthService);
  readonly layoutService = inject(LayoutService);
  readonly userDropdownOpen = signal(false);

  toggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }

  toggleUserDropdown(): void {
    this.userDropdownOpen.update(value => !value);
  }

  closeUserDropdown(): void {
    this.userDropdownOpen.set(false);
  }

  logout(): void {
    this.closeUserDropdown();
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.dropdown');

    if (!dropdown && this.userDropdownOpen()) {
      this.closeUserDropdown();
    }
  }
}
