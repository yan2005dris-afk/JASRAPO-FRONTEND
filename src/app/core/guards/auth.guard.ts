import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas que requieren sesión activa.
 * Redirige a /login con returnUrl devolviendo UrlTree.
 */
export const authGuard: CanActivateFn = (_, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return true;
};

/**
 * Guard específico para rutas administrativas legacy (sin migrar en este PR).
 */
export const adminCapabilityGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (!authService.isAdminOrSupervisor()) {
    return router.createUrlTree([authService.getDefaultRoute()]);
  }

  return true;
};

/**
 * Guard para páginas de invitados (ej: /login). Redirige usuarios autenticados
 * a su ruta por defecto devolviendo UrlTree.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  const defaultRoute = authService.getDefaultRoute();
  if (!defaultRoute || defaultRoute === '/login') {
    authService.logout();
    return true;
  }

  return router.createUrlTree([defaultRoute]);
};
