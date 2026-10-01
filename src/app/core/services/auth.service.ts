import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  Observable,
  tap,
  catchError,
  throwError,
  switchMap,
  timer,
  Subscription,
  shareReplay,
} from 'rxjs';
import { LoginRequest, LoginResponse, RefreshTokenResponse, User } from '../models/auth.model';
import { environment } from '../../../environments/environment';
import { MenuService } from './menu.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly menuService = inject(MenuService);

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

  private refreshTimerSubscription: Subscription | null = null;

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/login`, credentials, { withCredentials: true })
      .pipe(
        tap((response: LoginResponse) => this.handleLoginSuccess(response)),
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
    this.menuService.clearMenu();
    sessionStorage.removeItem('jasrapo_operator_synced');
    this.router.navigate(['/login']);
  }

  private refreshInProgress$: Observable<RefreshTokenResponse> | null = null;

  refreshToken(): Observable<RefreshTokenResponse> {
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    this.refreshInProgress$ = this.http
      .post<RefreshTokenResponse>(`${this.API_URL}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response: RefreshTokenResponse) => {
          this.handleRefreshSuccess(response);
          this.refreshInProgress$ = null;
        }),
        catchError((error) => {
          this.refreshInProgress$ = null;
          console.error('Error al refrescar token:', error);
          return throwError(() => error);
        }),
        shareReplay(1),
      );

    return this.refreshInProgress$;
  }

  private calculateRefreshDelay(): number {
    const expiresAt = this.tokenExpiresAtSignal();
    if (!expiresAt) return 0;
    const expirationTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const createdAt = this.tokenCreatedAtSignal();
    const createdTime = createdAt ? new Date(createdAt).getTime() : now;

    const lifetime = expirationTime - createdTime;

    let refreshTime: number;
    if (lifetime <= 3 * 60 * 1000) {
      refreshTime = createdTime + lifetime * 0.8;
    } else {
      refreshTime = expirationTime - 2 * 60 * 1000;
    }

    const delayMs = refreshTime - now;
    return delayMs > 0 ? delayMs : 0;
  }

  constructor() {
    if (this.isAuthenticated()) {
      this.startRefreshTimer();
    }
  }

  private startRefreshTimer(): void {
    this.cancelRefreshTimer();

    if (!this.isAuthenticated() || !this.tokenExpiresAtSignal()) {
      return;
    }

    const delayMs = this.calculateRefreshDelay();

    this.refreshTimerSubscription = timer(delayMs)
      .pipe(switchMap(() => this.refreshToken()))
      .subscribe({
        next: () => console.log('Token refrescado automaticamente'),
        error: (error) => console.error('Error en auto-refresh:', error),
      });
  }

  private cancelRefreshTimer(): void {
    if (this.refreshTimerSubscription) {
      this.refreshTimerSubscription.unsubscribe();
      this.refreshTimerSubscription = null;
    }
  }

  private handleLoginSuccess(response: LoginResponse): void {
    const { sub, accessToken, sid, email, nombre, rolId, nombreRol, avatar, accessTokenInfo } =
      response;

    const createdAt = accessTokenInfo?.iatDate || new Date().toISOString();
    const expiresAt =
      accessTokenInfo?.expDate || new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const user: User = {
      id: String(sub),
      email: email || '',
      name: nombre || 'Usuario',
      roleId: rolId,
      roleName: nombreRol || 'Usuario',
      avatar,
    };

    this.updateSignalsAndStorage(accessToken, String(sid), createdAt, expiresAt, user);
    this.startRefreshTimer();
  }

  private handleRefreshSuccess(response: RefreshTokenResponse): void {
    const newAccessToken = response.accessToken;
    const createdAt = response.createdAt || new Date().toISOString();
    const expiresAt = response.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();

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
    keys.forEach((key) => this.removeStorageItem(key));

    this.cancelRefreshTimer();
  }

  private getStorageItem(key: string): string | null {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setStorageItem(key: string, value: string): void {
    if (typeof localStorage === 'undefined' || !localStorage) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignorar fallos de cuota o sandbox
    }
  }

  private removeStorageItem(key: string): void {
    if (typeof localStorage === 'undefined' || !localStorage) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignorar fallos de sandbox
    }
  }

  private getStoredToken(): string | null {
    return this.getStorageItem('token');
  }

  private getStoredSid(): string | null {
    return this.getStorageItem('sid');
  }

  private getStoredTokenCreatedAt(): string | null {
    return this.getStorageItem('tokenCreatedAt');
  }

  private getStoredTokenExpiresAt(): string | null {
    return this.getStorageItem('tokenExpiresAt');
  }

  private getStoredUser(): User | null {
    const userJson = this.getStorageItem('user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  updateCurrentUser(patch: Partial<User>): void {
    const current = this.userSignal();
    if (!current) return;
    const updated: User = { ...current, ...patch };
    this.userSignal.set(updated);
    this.setStorageItem('user', JSON.stringify(updated));
  }

  /**
   * Verifica si el usuario actual tiene rol de operador.
   */
  isOperator(): boolean {
    const role = this.currentUser()?.roleName?.toLowerCase() ?? '';
    return role === 'operador' || role === 'operadores';
  }

  /**
   * Verifica si el usuario actual es Super Admin (admin o superadmin).
   * Solo estos roles pueden modificar la lectura inicial de medidores.
   */
  isSuperAdmin(): boolean {
    const role = this.currentUser()?.roleName?.toLowerCase() ?? '';
    return role === 'admin' || role === 'superadmin';
  }

  /**
   * Retorna la ruta por defecto según el rol del usuario.
   * Operadores → panel del operador. El resto → dashboard.
   */
  getDefaultRoute(): string {
    return this.isOperator() ? '/app/operador/inicio' : '/app/dashboard';
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
