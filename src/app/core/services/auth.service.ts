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
    
    private readonly tokenSignal = signal<string | null>(this.getStoredToken());
    private readonly sidSignal = signal<string | null>(this.getStoredSid());
    private readonly tokenCreatedAtSignal = signal<string | null>(this.getStoredTokenCreatedAt());
    private readonly tokenExpiresAtSignal = signal<string | null>(this.getStoredTokenExpiresAt());
    private readonly userSignal = signal<User | null>(this.getStoredUser());
    
    readonly isAuthenticated = computed(() => !!this.tokenSignal());
    readonly currentUser = computed(() => this.userSignal());
    readonly token = computed(() => this.tokenSignal());
    readonly sid = computed(() => this.sidSignal());
    readonly tokenCreatedAt = computed(() => this.tokenCreatedAtSignal());
    readonly tokenExpiresAt = computed(() => this.tokenExpiresAtSignal());
    
    private refreshTimerSubscription: any = null;

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
        this.clearAuthData();
        this.router.navigate(['/login']);
    }

    refreshToken(): Observable<RefreshTokenResponse> {
        return this.http.post<RefreshTokenResponse>(
            `${this.API_URL}/refresh`,
            {},
            { withCredentials: true }
        ).pipe(
            tap(response => this.handleRefreshSuccess(response)),
            catchError(error => {
                console.error('Error al refrescar token:', error);
                this.logout();
                return throwError(() => error);
            })
        );
    }

    private shouldRefreshToken(): boolean {
        const expiresAt = this.tokenExpiresAtSignal();
        if (!expiresAt) return false;
        const expirationTime = new Date(expiresAt).getTime();
        const now = Date.now();
        const twoMinutes = 2 * 60 * 1000;
        return (expirationTime - now) <= twoMinutes;
    }

    private calculateRefreshDelay(): number {
        const expiresAt = this.tokenExpiresAtSignal();
        if (!expiresAt) return 0;
        const expirationTime = new Date(expiresAt).getTime();
        const now = Date.now();
        const twoMinutes = 2 * 60 * 1000;
        const refreshTime = expirationTime - twoMinutes;
        const delayMs = refreshTime - now;
        return delayMs > 0 ? delayMs : 0;
    }

    private startRefreshTimer(): void {
        this.cancelRefreshTimer();
        const delayMs = this.calculateRefreshDelay();
        if (delayMs > 0) {
            this.refreshTimerSubscription = timer(delayMs).pipe(
                switchMap(() => this.refreshToken())
            ).subscribe({
                next: () => console.log('Token refrescado automaticamente'),
                error: (error) => console.error('Error en auto-refresh:', error)
            });
        }
    }

    private cancelRefreshTimer(): void {
        if (this.refreshTimerSubscription) {
            this.refreshTimerSubscription.unsubscribe();
            this.refreshTimerSubscription = null;
        }
    }

    private handleLoginSuccess(response: any): void {
        const sub = response.sub;
        const accessToken = response.accessToken;
        const sid = response.sid;
        
        // El backend puede devolver iat/exp como fechas ISO string o timestamps
        let createdAt: string;
        let expiresAt: string;
        
        // Verificar si iat y exp son strings (fechas ISO) o números (timestamps)
        if (response.exp && typeof response.exp === 'string') {
            // El backend devuelve fechas ISO string
            createdAt = response.iat || new Date().toISOString();
            expiresAt = response.exp;
        } else if (response.exp) {
            // El backend devuelve timestamps unix
            createdAt = response.iat 
                ? new Date(response.iat * 1000).toISOString()
                : new Date().toISOString();
            expiresAt = new Date(response.exp * 1000).toISOString();
        } else {
            // No hay información de fecha, usar valores por defecto
            createdAt = new Date().toISOString();
            expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        const user: User = {
            id: String(sub),
            email: response.email || '',
            name: response.name || 'Usuario',
            roleId: response.roleId || 1,
            roleName: response.roleName || 'Usuario',
            avatar: response.avatar
        };

        this.tokenSignal.set(accessToken);
        this.sidSignal.set(String(sid));
        this.tokenCreatedAtSignal.set(createdAt);
        this.tokenExpiresAtSignal.set(expiresAt);
        this.userSignal.set(user);
        
        localStorage.setItem('token', accessToken);
        localStorage.setItem('sid', String(sid));
        localStorage.setItem('tokenCreatedAt', createdAt);
        localStorage.setItem('tokenExpiresAt', expiresAt);
        localStorage.setItem('user', JSON.stringify(user));
        
        this.startRefreshTimer();
    }

    private handleRefreshSuccess(response: any): void {
        const newAccessToken = response.accessToken || response.token;
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        
        this.tokenSignal.set(newAccessToken);
        this.tokenCreatedAtSignal.set(createdAt);
        this.tokenExpiresAtSignal.set(expiresAt);
        
        localStorage.setItem('token', newAccessToken);
        localStorage.setItem('tokenCreatedAt', createdAt);
        localStorage.setItem('tokenExpiresAt', expiresAt);
        
        this.startRefreshTimer();
    }

    private clearAuthData(): void {
        this.tokenSignal.set(null);
        this.sidSignal.set(null);
        this.tokenCreatedAtSignal.set(null);
        this.tokenExpiresAtSignal.set(null);
        this.userSignal.set(null);
        
        localStorage.removeItem('token');
        localStorage.removeItem('sid');
        localStorage.removeItem('tokenCreatedAt');
        localStorage.removeItem('tokenExpiresAt');
        localStorage.removeItem('user');
        
        this.cancelRefreshTimer();
    }

    private getStoredToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    private getStoredSid(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sid');
        }
        return null;
    }

    private getStoredTokenCreatedAt(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tokenCreatedAt');
        }
        return null;
    }

    private getStoredTokenExpiresAt(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tokenExpiresAt');
        }
        return null;
    }

    private getStoredUser(): User | null {
        if (typeof window !== 'undefined') {
            const userJson = localStorage.getItem('user');
            return userJson ? JSON.parse(userJson) : null;
        }
        return null;
    }

    private handleError(error: any): Observable<never> {
        console.error('Error en autenticacion:', error);
        let errorMessage = 'Ocurrio un error en el servidor';
        if (error.error?.message) {
            errorMessage = error.error.message;
        } else if (error.status === 401) {
            errorMessage = 'Credenciales invalidas';
        } else if (error.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor';
        }
        return throwError(() => new Error(errorMessage));
    }
}
