import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const store = new Map<string, string>();
  const routerMock = { navigate: vi.fn(), parseUrl: vi.fn(), createUrlTree: vi.fn() };

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    });
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerMock },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    store.clear();
  });

  it('initializes with empty capabilities and fails closed on corrupted storage', () => {
    expect(service.capabilities()).toEqual([]);
    expect(service.hasCapability('routes', 'read')).toBe(false);
    expect(service.getDefaultRoute()).toBe('/login');
  });

  it('clears stale session if token exists but capabilities are missing', () => {
    store.set('token', 'stale-token');
    const staleService = TestBed.runInInjectionContext(() => new AuthService());
    expect(staleService.isAuthenticated()).toBe(false);
    expect(store.get('token')).toBeUndefined();
  });

  it('updates capabilitiesSignal on successful login', () => {
    service.login({ email: 'test@example.com', password: 'password' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({
      accessToken: 'token-1',
      sid: 'sid-1',
      sub: 1,
      email: 'test@example.com',
      capabilities: [{ resource: 'routes', action: 'read' }],
    });

    expect(service.capabilities()).toEqual([{ resource: 'routes', action: 'read' }]);
    expect(service.hasCapability('routes', 'read')).toBe(true);
    expect(service.hasCapability('dashboard', 'read')).toBe(false);
    expect(service.getDefaultRoute()).toBe('/app/operator/routes');
  });

  it('updates capabilitiesSignal on successful refresh', () => {
    service.refreshToken().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    req.flush({
      accessToken: 'token-2',
      capabilities: [{ resource: 'dashboard', action: 'read' }],
    });

    expect(service.capabilities()).toEqual([{ resource: 'dashboard', action: 'read' }]);
    expect(service.getDefaultRoute()).toBe('/app/backoffice/dashboard');
  });

  it('clears capabilitiesSignal and storage on logout', () => {
    store.set('capabilities', JSON.stringify([{ resource: 'routes', action: 'read' }]));
    service.logout();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    req.flush({});

    expect(service.capabilities()).toEqual([]);
    expect(store.get('capabilities')).toBeUndefined();
  });
});
