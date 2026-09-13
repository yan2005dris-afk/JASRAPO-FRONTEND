import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { getRouteDefinition, hasCapability } from '../navigation/app-route.registry';

export const capabilityGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const routeId = route.data?.['routeId'];
  const definition = getRouteDefinition(routeId);
  const userCapabilities = authService.capabilities();
  const allowed = definition
    ? hasCapability(userCapabilities, definition.requiredCapability)
    : false;

  if (!allowed) {
    const defaultRoute = authService.getDefaultRoute();
    const currentPath = state.url?.split('?')[0].split('#')[0];

    if (defaultRoute && defaultRoute !== currentPath && defaultRoute !== '/app/forbidden') {
      return router.createUrlTree([defaultRoute]);
    }

    return router.createUrlTree(['/app/forbidden']);
  }

  return true;
};
