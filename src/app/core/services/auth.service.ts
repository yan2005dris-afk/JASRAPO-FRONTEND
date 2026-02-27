import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of, delay, switchMap, timer } from 'rxjs';
import { LoginRequest, LoginResponse, RefreshTokenResponse, User } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    private readonly API_URL = `${environment.apiUrl}/auth`;

    // Signals para el estado de autenticación
    private readonly tokenSignal = signal<string | null>(this.getStoredToken());
    private readonly tokenCreatedAtSignal = signal<string | null>(this.getStoredTokenCreatedAt());
    private readonly tokenExpiresAtSignal = signal<string | null>(this.getStoredTokenExpiresAt());
    private readonly userSignal = signal<User | null>(this.getStoredUser());

    // Estado público computed
    readonly isAuthenticated = computed(() => !!this.tokenSignal());
    readonly currentUser = computed(() => this.userSignal());
    readonly token = computed(() => this.tokenSignal());
    readonly tokenCreatedAt = computed(() => this.tokenCreatedAtSignal());
    readonly tokenExpiresAt = computed(() => this.tokenExpiresAtSignal());

    // Timer para auto-refresh del token
    private refreshTimerSubscription: any = null;

    /**
     * Realiza el login del usuario
     * @param credentials Credenciales de acceso
     * @returns Observable con la respuesta del login
     */
    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(
            `${this.API_URL}/login`,
            credentials,
            { withCredentials: true }
        ).pipe(
            tap(response => this.handleLoginSuccess(response)),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Cierra la sesión del usuario
     */
    logout(): void {
        this.cancelRefreshTimer();

        this.http.post(
            `${this.API_URL}/logout`,
            {},
            { withCredentials: true }
        ).subscribe({
            next: () => {
                this.clearAuthData();
                this.router.navigate(['/login']);
            },
            error: () => {
                this.clearAuthData();
                this.router.navigate(['/login']);
            }
        });
    }

    /**
     * Refresca el token de autenticación usando el refresh token de la cookie
     * @returns Observable con el nuevo token
     */
    refreshToken(): Observable<RefreshTokenResponse> {
        // El refresh token se envía automáticamente como cookie HttpOnly
        return this.http.post<RefreshTokenResponse>(
            `${this.API_URL}/refresh`,
            {}, // Body vacío, el refresh token está en la cookie
            { withCredentials: true } // Importante para enviar/recibir cookies
        ).pipe(
            tap(response => this.handleRefreshSuccess(response)),
            catchError(error => {
                console.error('Error al refrescar token:', error);
                this.logout();
                return throwError(() => error);
            })
        );
    }

    /**
     * Verifica si el token está cerca de expirar y necesita ser refrescado
     * @returns true si el token expira en menos de 2 minutos
     */
    private shouldRefreshToken(): boolean {
        const expiresAt = this.tokenExpiresAtSignal();
        if (!expiresAt) return false;

        const expirationTime = new Date(expiresAt).getTime();
        const now = Date.now();
        const twoMinutes = 2 * 60 * 1000;

        return (expirationTime - now) <= twoMinutes;
    }

    /**
     * Calcula el tiempo en milisegundos hasta que el token deba ser refrescado
     * Refresca 2 minutos antes de la expiración
     */
    private calculateRefreshDelay(): number {
        const expiresAt = this.tokenExpiresAtSignal();
        if (!expiresAt) return 0;

        const expirationTime = new Date(expiresAt).getTime();
        const now = Date.now();
        const twoMinutes = 2 * 60 * 1000;

        // Refrescar 2 minutos antes de la expiración
        const refreshTime = expirationTime - twoMinutes;
        const delay = refreshTime - now;

        return delay > 0 ? delay : 0;
    }

    /**
     * Inicia el timer para auto-refresh del token
     */
    private startRefreshTimer(): void {
        this.cancelRefreshTimer();

        const delay = this.calculateRefreshDelay();
        if (delay > 0) {
            this.refreshTimerSubscription = timer(delay).pipe(
                switchMap(() => this.refreshToken())
            ).subscribe({
                next: () => console.log('Token refrescado automáticamente'),
                error: (error) => console.error('Error en auto-refresh:', error)
            });
        }
    }

    /**
     * Cancela el timer de auto-refresh
     */
    private cancelRefreshTimer(): void {
        if (this.refreshTimerSubscription) {
            this.refreshTimerSubscription.unsubscribe();
            this.refreshTimerSubscription = null;
        }
    }

    /**
     * Maneja la respuesta exitosa del login
     */
    private handleLoginSuccess(response: LoginResponse): void {
        this.tokenSignal.set(response.accessToken);
        this.tokenCreatedAtSignal.set(response.iat);
        this.tokenExpiresAtSignal.set(response.exp);

        // El backend no retorna objeto user completo, creamos uno básico con el ID (sub)
        const user: User = {
            id: response.sub.toString(),
            email: '',
            name: `Usuario ${response.sub}`,
            roleId: response.sid || 1
        };
        this.userSignal.set(user);

        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('tokenCreatedAt', response.iat);
        localStorage.setItem('tokenExpiresAt', response.exp);
        localStorage.setItem('user', JSON.stringify(user));

        this.startRefreshTimer();
    }

    /**
     * Maneja la respuesta exitosa del refresh token
     */
    private handleRefreshSuccess(response: RefreshTokenResponse): void {
        this.tokenSignal.set(response.accessToken);
        this.tokenCreatedAtSignal.set(response.iat);
        this.tokenExpiresAtSignal.set(response.exp);

        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('tokenCreatedAt', response.iat);
        localStorage.setItem('tokenExpiresAt', response.exp);

        this.startRefreshTimer();
    }

    /**
     * Limpia los datos de autenticación
     */
    private clearAuthData(): void {
        this.tokenSignal.set(null);
        this.tokenCreatedAtSignal.set(null);
        this.tokenExpiresAtSignal.set(null);
        this.userSignal.set(null);

        localStorage.removeItem('token');
        localStorage.removeItem('tokenCreatedAt');
        localStorage.removeItem('tokenExpiresAt');
        localStorage.removeItem('user');

        this.cancelRefreshTimer();
    }

    /**
     * Obtiene el token almacenado
     */
    private getStoredToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    /**
     * Obtiene la fecha de creación del token almacenada
     */
    private getStoredTokenCreatedAt(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tokenCreatedAt');
        }
        return null;
    }

    /**
     * Obtiene la fecha de expiración del token almacenada
     */
    private getStoredTokenExpiresAt(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tokenExpiresAt');
        }
        return null;
    }

    /**
     * Obtiene el usuario almacenado
     */
    private getStoredUser(): User | null {
        if (typeof window !== 'undefined') {
            const userJson = localStorage.getItem('user');
            return userJson ? JSON.parse(userJson) : null;
        }
        return null;
    }

    /**
     * Maneja errores de las peticiones
     */
    private handleError(error: any): Observable<never> {
        console.error('Error en autenticación:', error);

        let errorMessage = 'Ocurrió un error en el servidor';

        if (error.error?.message) {
            errorMessage = error.error.message;
        } else if (error.status === 401) {
            errorMessage = 'Credenciales inválidas';
        } else if (error.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor';
        }

        return throwError(() => new Error(errorMessage));
    }
}
