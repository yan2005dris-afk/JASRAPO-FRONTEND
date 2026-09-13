import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas que requieren autenticación.
 * Implementa control granular según capacidades y roles:
 *  - Si no está autenticado → /login
 *  - Operadores intentando acceder a rutas no operativas (/app/*) → /app/operador/rutas
 *  - Usuarios sin capacidad de campo intentando acceder a /app/operador → /app/dashboard
 */
export const authGuard: CanActivateFn = (_, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  const url = state.url;
  const isOperatorRoute = url.startsWith('/app/operador');
  const isOperator = authService.isOperator();

  // Operador exclusivo intentando acceder a rutas administrativas o fuera de su contexto
  if (isOperator && !isOperatorRoute) {
    router.navigate(['/app/operador/rutas']);
    return false;
  }

  // Si intenta acceder a rutas de operador pero no tiene capacidad para ello
  if (isOperatorRoute && !authService.canAccessOperatorRoutes()) {
    router.navigate(['/app/dashboard']);
    return false;
  }

  return true;
};

/**
 * Guard específico para rutas administrativas que requieren capacidad de admin o supervisor.
 */
export const adminCapabilityGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.isAdminOrSupervisor()) {
    router.navigate([authService.getDefaultRoute()]);
    return false;
  }

  return true;
};

/**
 * Guard para redirigir usuarios ya autenticados (ej: página de login).
 * Redirige a la ruta por defecto según el rol.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Si ya está autenticado, redirigir al panel según su rol
  router.navigate([authService.getDefaultRoute()]);
  return false;
};
