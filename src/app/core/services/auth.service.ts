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
  map,
  of,
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

  private readonly tokenSignal = signal<string | null>(null);
  private readonly sidSignal = signal<string | null>(null);
  private readonly tokenCreatedAtSignal = signal<string | null>(null);
  private readonly tokenExpiresAtSignal = signal<string | null>(null);
  private readonly userSignal = signal<User | null>(null);
  private readonly isInitializedSignal = signal<boolean>(false);

  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isInitialized = computed(() => this.isInitializedSignal());
  readonly currentUser = computed(() => this.userSignal());
  readonly token = computed(() => this.tokenSignal());
  readonly sid = computed(() => this.sidSignal());
  readonly tokenCreatedAt = computed(() => this.tokenCreatedAtSignal());
  readonly tokenExpiresAt = computed(() => this.tokenExpiresAtSignal());

  private refreshTimerSubscription: Subscription | null = null;
  private refreshInProgress$: Observable<RefreshTokenResponse> | null = null;

  /**
   * Inicializa la autenticación silenciosa al arrancar la aplicación o evaluar el primer guard.
   * Si ya se inicializó o hay un token en memoria, resuelve inmediatamente.
   * De lo contrario, consulta al backend (/auth/refresh) utilizando la cookie HTTP-only.
   */
  initializeAuth(): Observable<boolean> {
    if (this.isInitializedSignal()) {
      return of(this.isAuthenticated());
    }

    return this.refreshToken().pipe(
      map(() => {
        this.isInitializedSignal.set(true);
        return true;
      }),
      catchError(() => {
        this.clearAuthData();
        this.isInitializedSignal.set(true);
        return of(false);
      }),
    );
  }

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

    this.updateSignals(accessToken, String(sid), createdAt, expiresAt, user);
    this.isInitializedSignal.set(true);
    this.startRefreshTimer();
  }

  private handleRefreshSuccess(response: RefreshTokenResponse): void {
    const newAccessToken = response.accessToken;
    const createdAt = response.createdAt || new Date().toISOString();
    const expiresAt = response.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();

    this.tokenSignal.set(newAccessToken);
    this.tokenCreatedAtSignal.set(createdAt);
    this.tokenExpiresAtSignal.set(expiresAt);

    if (response.sid) {
      this.sidSignal.set(String(response.sid));
    }

    if (response.sub) {
      const user: User = {
        id: String(response.sub),
        email: response.email || '',
        name: response.nombre || 'Usuario',
        roleId: response.rolId ?? null,
        roleName: response.nombreRol || 'Usuario',
        avatar: (typeof response.avatar === 'object' ? response.avatar : null) as User['avatar'],
      };
      this.userSignal.set(user);
    }

    this.isInitializedSignal.set(true);
    this.startRefreshTimer();
  }

  private updateSignals(
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
  }

  private clearAuthData(): void {
    this.tokenSignal.set(null);
    this.sidSignal.set(null);
    this.tokenCreatedAtSignal.set(null);
    this.tokenExpiresAtSignal.set(null);
    this.userSignal.set(null);

    // Limpieza de compatibilidad por si existían valores antiguos en storage
    this.removeLegacyStorageKeys();
    this.cancelRefreshTimer();
  }

  private removeLegacyStorageKeys(): void {
    if (typeof localStorage === 'undefined' || !localStorage) return;
    try {
      const legacyKeys = ['token', 'sid', 'tokenCreatedAt', 'tokenExpiresAt', 'user'];
      legacyKeys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignorar fallos de sandbox
    }
  }

  updateCurrentUser(patch: Partial<User>): void {
    const current = this.userSignal();
    if (!current) return;
    const updated: User = { ...current, ...patch };
    this.userSignal.set(updated);
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
