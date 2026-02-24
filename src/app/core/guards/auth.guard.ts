import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas que requieren autenticación
 */
export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
        return true;
    }

    // Redirigir al login guardando la URL solicitada
    router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
    });
    
    return false;
};

/**
 * Guard para redirigir usuarios autenticados (ej: página de login)
 */
export const guestGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
        return true;
    }

    // Si ya está autenticado, redirigir al dashboard
    router.navigate(['/app/dashboard']);
    return false;
};
