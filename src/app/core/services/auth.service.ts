import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap, timer, Subscription } from 'rxjs';
import { LoginRequest, LoginResponse, RefreshTokenResponse, User } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
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

  // Tipado correcto para la suscripción del timer
  private refreshTimerSubscription: Subscription | null = null;

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/login`, credentials, { withCredentials: true })
      .pipe(
        tap((response) => this.handleLoginSuccess(response)),
        catchError((error) => this.handleError(error)),
      );
  }

  logout(): void {
    this.cancelRefreshTimer();
    this.http.post(`${this.API_URL}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.executeLocalLogout(),
      error: () => this.executeLocalLogout(),
    });
  }

  private executeLocalLogout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    return this.http
      .post<RefreshTokenResponse>(`${this.API_URL}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.handleRefreshSuccess(response)),
        catchError((error) => {
          console.error('Error al refrescar token:', error);
          this.logout();
          return throwError(() => error);
        }),
      );
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
      this.refreshTimerSubscription = timer(delayMs)
        .pipe(switchMap(() => this.refreshToken()))
        .subscribe({
          next: () => console.log('Token refrescado automaticamente'),
          error: (error) => console.error('Error en auto-refresh:', error),
        });
    }
  }

  private cancelRefreshTimer(): void {
    if (this.refreshTimerSubscription) {
      this.refreshTimerSubscription.unsubscribe();
      this.refreshTimerSubscription = null;
    }
  }

  // Cambiado 'any' por 'LoginResponse'
  private handleLoginSuccess(response: LoginResponse): void {
    // Usamos desestructuración para que el código sea más limpio
    const { sub, accessToken, sid, email, name, roleId, roleName, avatar, iat, exp } = response;

    let createdAt: string;
    let expiresAt: string;

    if (typeof exp === 'number') {
      createdAt =
        typeof iat === 'number' ? new Date(iat * 1000).toISOString() : new Date().toISOString();
      expiresAt = new Date(exp * 1000).toISOString();
    } else if (typeof exp === 'string') {
      createdAt = typeof iat === 'string' ? iat : new Date().toISOString();
      expiresAt = exp;
    } else {
      createdAt = new Date().toISOString();
      expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }

    const user: User = {
      id: String(sub),
      email: email || '',
      name: name || 'Usuario',
      roleId: roleId || 1,
      roleName: roleName || 'Usuario',
      avatar,
    };

    this.updateSignalsAndStorage(accessToken, String(sid), createdAt, expiresAt, user);
    this.startRefreshTimer();
  }

  private handleRefreshSuccess(response: RefreshTokenResponse): void {
    const newAccessToken = response.accessToken;
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

  private updateSignalsAndStorage(
    token: string,
    sid: string,
    created: string,
    expires: string,
    user: User,
  ): void {
    this.tokenSignal.set(token);
    this.sidSignal.set(sid);
    this.tokenCreatedAtSignal.set(created);
    this.tokenExpiresAtSignal.set(expires);
    this.userSignal.set(user);

    localStorage.setItem('token', token);
    localStorage.setItem('sid', sid);
    localStorage.setItem('tokenCreatedAt', created);
    localStorage.setItem('tokenExpiresAt', expires);
    localStorage.setItem('user', JSON.stringify(user));
  }

  private clearAuthData(): void {
    this.tokenSignal.set(null);
    this.sidSignal.set(null);
    this.tokenCreatedAtSignal.set(null);
    this.tokenExpiresAtSignal.set(null);
    this.userSignal.set(null);

    const keys = ['token', 'sid', 'tokenCreatedAt', 'tokenExpiresAt', 'user'];
    keys.forEach((key) => localStorage.removeItem(key));

    this.cancelRefreshTimer();
  }

  // Métodos de obtención de Storage
  private getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  private getStoredSid(): string | null {
    return localStorage.getItem('sid');
  }

  private getStoredTokenCreatedAt(): string | null {
    return localStorage.getItem('tokenCreatedAt');
  }

  private getStoredTokenExpiresAt(): string | null {
    return localStorage.getItem('tokenExpiresAt');
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  private handleError(error: { error?: { message?: string }; status?: number }): Observable<never> {
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
