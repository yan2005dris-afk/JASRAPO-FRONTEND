import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor híbrido para autenticación:
 * - Agrega access token en header Authorization (Bearer)
 * - Habilita withCredentials para envío/recepción de cookies (refresh token)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.token();

    // Clonar la petición con withCredentials y opcionalmente el Bearer token
    const modifications: any = {
        withCredentials: true // Permite cookies HttpOnly (refresh token)
    };

    // Si hay access token, agregarlo al header Authorization
    if (token) {
        modifications.setHeaders = {
            Authorization: `Bearer ${token}`
        };
    }

    const authReq = req.clone(modifications);

    return next(authReq);
};
