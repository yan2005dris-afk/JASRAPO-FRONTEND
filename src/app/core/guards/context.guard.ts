import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AppContext, getRouteDefinition } from '../navigation/app-route.registry';

export const contextGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const routeId = route.data?.['routeId'];
  const expectedContext: AppContext | undefined = route.data?.['context'];

  let valid = true;
  if (routeId) {
    const definition = getRouteDefinition(routeId);
    if (!definition || (expectedContext && definition.context !== expectedContext)) {
      valid = false;
    }
  } else if (!expectedContext) {
    valid = false;
  }

  if (!valid) {
    const defaultRoute = authService.getDefaultRoute();
    const currentPath = state.url?.split('?')[0].split('#')[0];

    if (defaultRoute && defaultRoute !== currentPath && defaultRoute !== '/app/forbidden') {
      return router.createUrlTree([defaultRoute]);
    }

    return router.createUrlTree(['/app/forbidden']);
  }

  return true;
};
