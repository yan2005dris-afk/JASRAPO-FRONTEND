import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  AppContext,
  getRouteDefinition,
  canAccessContext,
  getDefaultRouteForContext,
} from './app-route.registry';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AppContextService {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  private readonly contextSignal = signal<AppContext>('backoffice');

  readonly currentContext = computed(() => this.contextSignal());
  readonly isOperator = computed(() => this.contextSignal() === 'operator');
  readonly isBackoffice = computed(() => this.contextSignal() === 'backoffice');

  readonly canAccessOperator = computed(() => {
    return canAccessContext('operator', this.authService.capabilities());
  });

  readonly canAccessBackoffice = computed(() => {
    return canAccessContext('backoffice', this.authService.capabilities());
  });

  readonly hasDualContext = computed(() => this.canAccessOperator() && this.canAccessBackoffice());

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateContextFromRoot(this.router.routerState.snapshot.root);
      });
  }

  switchToContext(targetContext: AppContext): void {
    const capabilities = this.authService.capabilities();
    const targetRoute =
      getDefaultRouteForContext(targetContext, capabilities) ??
      (targetContext === 'operator' ? '/app/operator/routes' : '/app/backoffice/dashboard');

    this.router.navigate([targetRoute]);
  }

  getContextFromRouteId(routeId?: string | null): AppContext {
    if (!routeId) return 'backoffice';
    const def = getRouteDefinition(routeId);
    return def?.context ?? 'backoffice';
  }

  setContext(context: AppContext): void {
    this.contextSignal.set(context);
  }

  updateContextFromRoot(root: ActivatedRouteSnapshot): void {
    const routeId = this.findDeepestRouteId(root);
    const context = this.getContextFromRouteId(routeId);
    this.contextSignal.set(context);
  }

  private findDeepestRouteId(snapshot: ActivatedRouteSnapshot): string | null {
    let current: ActivatedRouteSnapshot | null = snapshot;
    let foundRouteId: string | null = snapshot.data?.['routeId'] ?? null;

    while (current.firstChild) {
      current = current.firstChild;
      if (current.data?.['routeId']) {
        foundRouteId = current.data['routeId'];
      }
    }

    return foundRouteId;
  }
}
