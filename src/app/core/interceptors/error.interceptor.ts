import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';

interface IErrorResponse {
  statusCode: number;
  message: string;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/logout') ||
        req.url.includes('/auth/refresh');

      if (error.status === 401 && !isAuthEndpoint) {
        toastService.error('Su sesión ha expirado o no está autorizado. Inicie sesión de nuevo.');
        authService.logout();
      } else if (error.status === 403) {
        const errorResponse = error.error as IErrorResponse;
        const message =
          errorResponse?.message || 'No tienes permisos suficientes para realizar esta acción';
        toastService.error(message);
      }

      return throwError(() => error);
    }),
  );
};
