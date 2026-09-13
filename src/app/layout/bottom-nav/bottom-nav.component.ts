import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { AuthService } from '../../core/services/auth.service';
import { AppContextService } from '../../core/navigation/app-context.service';
import { AppRouteDefinition, getBottomNavRoutes } from '../../core/navigation/app-route.registry';

@Component({
  selector: 'app-bottom-nav',
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  readonly syncService = inject(OperatorSyncService);
  private readonly authService = inject(AuthService);
  readonly appContextService = inject(AppContextService);

  readonly bottomNavItems = computed<AppRouteDefinition[]>(() => {
    const context = this.appContextService.currentContext();
    const capabilities = this.authService.capabilities();
    return getBottomNavRoutes(context, capabilities);
  });
}
