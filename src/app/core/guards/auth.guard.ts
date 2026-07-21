import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas que requieren autenticación.
 * Implementa bloqueo cruzado por rol:
 *  - Operadores que intenten acceder a rutas /app (admin) → redirigen a /app/operador/rutas
 *  - No operadores que intenten acceder a /app/operador → redirigen a /app/dashboard
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

  const isOperator = authService.isOperator();
  const url = state.url;
  const isOperatorRoute = url.startsWith('/app/operador');
  const isAdminRoute = url.startsWith('/app') && !isOperatorRoute;

  // Operador intentando acceder a rutas del panel admin
  if (isOperator && isAdminRoute) {
    router.navigate(['/app/operador/rutas']);
    return false;
  }

  // No operador intentando acceder a rutas del operador
  if (!isOperator && isOperatorRoute) {
    router.navigate(['/app/dashboard']);
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
