import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor híbrido para autenticación:
 * - Agrega access token en header Authorization (Bearer)
 * - Habilita withCredentials para envío/recepción de cookies (refresh token)
 * - Maneja errores 401 cerrando la sesión
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  // Clonamos la petición base habilitando siempre withCredentials para las Cookies HttpOnly
  let authReq = req.clone({
    withCredentials: true,
  });

  // Si existe un token de acceso, clonamos nuevamente para inyectar el Header
  if (token) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si recibimos un 401 y no estamos en la ruta de login
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};

