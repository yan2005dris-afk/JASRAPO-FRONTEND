import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

/**
 * Guard para proteger rutas que requieren autenticación.
 * Inicializa de forma silenciosa la sesión si aún no se ha hidratado en memoria.
 * Implementa bloqueo cruzado por rol:
 *  - Operadores que intenten acceder a rutas /app (admin) → redirigen a /app/operador/inicio
 *  - No operadores que intenten acceder a /app/operador → redirigen a /app/dashboard
 */
export const authGuard: CanActivateFn = (_, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.initializeAuth().pipe(
    map((isAuthenticated) => {
      if (!isAuthenticated) {
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
        router.navigate(['/app/operador/inicio']);
        return false;
      }

      // No operador intentando acceder a rutas del operador
      if (!isOperator && isOperatorRoute) {
        router.navigate(['/app/dashboard']);
        return false;
      }

      return true;
    }),
  );
};

/**
 * Guard para redirigir usuarios ya autenticados (ej: página de login).
 * Redirige a la ruta por defecto según el rol.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.initializeAuth().pipe(
    map((isAuthenticated) => {
      if (!isAuthenticated) {
        return true;
      }

      // Si ya está autenticado, redirigir al panel según su rol
      router.navigate([authService.getDefaultRoute()]);
      return false;
    }),
  );
};
