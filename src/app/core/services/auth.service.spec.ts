import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { Subject, firstValueFrom, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { MenuService } from './menu.service';
import { NetworkService } from './network.service';
import type { LoginResponse, RefreshTokenResponse } from '../models/auth.model';

const STORAGE_KEY = 'jasrapo_offline_operator_session';

const operatorLogin: LoginResponse = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  sid: 'session-id',
  sub: 42,
  email: 'operador@example.com',
  nombre: 'María Operadora',
  rolId: 3,
  nombreRol: 'Operador',
  avatar: { url: '' },
  roles: [3],
  accessTokenInfo: {
    iat: 1,
    exp: 2,
    iatDate: new Date().toISOString(),
    expDate: new Date(Date.now() + 15 * 60_000).toISOString(),
  },
  refreshTokenInfo: {
    iat: 1,
    exp: 2,
    iatDate: new Date().toISOString(),
    expDate: new Date(Date.now() + 60 * 60_000).toISOString(),
  },
};

function setup(online: boolean, response?: RefreshTokenResponse) {
  const isOnline = signal(online);
  const connected = new Subject<void>();
  const http = {
    post: vi.fn((url: string) =>
      url.endsWith('/login')
        ? of(operatorLogin)
        : url.endsWith('/refresh')
          ? of(response ?? { accessToken: 'renewed-token', sub: 42, nombreRol: 'Operador' })
          : of({}),
    ),
  };
  const router = { navigate: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      AuthService,
      { provide: HttpClient, useValue: http },
      { provide: Router, useValue: router },
      { provide: MenuService, useValue: { clearMenu: vi.fn() } },
      {
        provide: NetworkService,
        useValue: { isOnline, connected$: connected.asObservable() },
      },
    ],
  });
  return { auth: TestBed.inject(AuthService), http, router, isOnline, connected };
}

describe('AuthService - sesión offline del operador', () => {
  beforeEach(() => sessionStorage.clear());

  it('guarda solo la identidad del operador, sin token, tras un login válido', async () => {
    const { auth } = setup(true);

    await firstValueFrom(auth.login({ email: 'operador@example.com', password: 'secret' }));

    const stored = sessionStorage.getItem(STORAGE_KEY);
    expect(stored).toContain('María Operadora');
    expect(stored).not.toContain('access-token');
    expect(stored).not.toContain('refresh-token');
  });

  it('mantiene el acceso a rutas de operador al recargar sin red y revalida al reconectar', async () => {
    const initial = setup(true);
    await firstValueFrom(initial.auth.login({ email: 'operador@example.com', password: 'secret' }));
    TestBed.resetTestingModule(); // Simula el nuevo inyector creado por F5.

    const reloaded = setup(false);
    expect(await firstValueFrom(reloaded.auth.initializeAuth())).toBe(true);
    expect(reloaded.auth.currentUser()?.id).toBe('42');
    expect(reloaded.auth.isOperator()).toBe(true);
    expect(reloaded.auth.isAuthenticated()).toBe(true);
    expect(reloaded.auth.token()).toBeNull();
    expect(reloaded.http.post).not.toHaveBeenCalled();

    reloaded.isOnline.set(true);
    reloaded.connected.next();
    expect(reloaded.http.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      {},
      { withCredentials: true },
    );
    expect(reloaded.auth.token()).toBe('renewed-token');
  });

  it('no permite restaurar sin conexión una identidad no operadora', async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: '7', roleName: 'Admin', name: 'Admin' }),
    );
    const { auth, http } = setup(false);

    expect(await firstValueFrom(auth.initializeAuth())).toBe(false);
    expect(auth.currentUser()).toBeNull();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('el cierre de sesión sin red limpia la identidad inmediatamente', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: '42', roleName: 'Operador' }));
    const { auth, router, http } = setup(false);
    expect(await firstValueFrom(auth.initializeAuth())).toBe(true);

    auth.logout();

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('si falla la red al refrescar, conserva la identidad offline previamente validada', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: '42', roleName: 'Operador' }));
    const context = setup(true);
    context.http.post.mockImplementation(() => throwError(() => ({ status: 0 })));

    expect(await firstValueFrom(context.auth.initializeAuth())).toBe(true);
    expect(context.auth.currentUser()?.id).toBe('42');
  });

  it('si el servidor rechaza el refresh, no restaura la identidad offline', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: '42', roleName: 'Operador' }));
    const context = setup(true);
    context.http.post.mockImplementation(() => throwError(() => ({ status: 401 })));

    expect(await firstValueFrom(context.auth.initializeAuth())).toBe(false);
    expect(context.auth.currentUser()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
