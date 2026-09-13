import { TestBed } from '@angular/core/testing';
import {
  Router,
  RouterStateSnapshot,
  ActivatedRouteSnapshot,
  UrlTree,
  NavigationExtras,
} from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { authGuard, guestGuard } from './auth.guard';
import { capabilityGuard } from './capability.guard';
import { contextGuard } from './context.guard';
import { AuthService } from '../services/auth.service';

interface MockUrlTree {
  commands: string[];
  extras?: NavigationExtras;
}

describe('Guards', () => {
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
    parseUrl: ReturnType<typeof vi.fn>;
  };
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    capabilities: ReturnType<typeof vi.fn>;
    getDefaultRoute: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/' } as RouterStateSnapshot;

  beforeEach(() => {
    routerMock = {
      createUrlTree: vi.fn(
        (commands: string[], extras?: NavigationExtras) =>
          ({
            commands,
            extras,
            toString: () => commands.join('/'),
          }) as unknown as UrlTree,
      ),
      parseUrl: vi.fn((url: string) => ({ url, toString: () => url }) as unknown as UrlTree),
    };

    authServiceMock = {
      isAuthenticated: vi.fn(() => false),
      capabilities: vi.fn(() => []),
      getDefaultRoute: vi.fn(() => '/app/backoffice/dashboard'),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
  });

  describe('authGuard', () => {
    it('redirects to /login preserving returnUrl when not authenticated', () => {
      authServiceMock.isAuthenticated.mockReturnValue(false);
      const state = { url: '/app/operator/routes' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        authGuard(dummyRoute, state),
      ) as unknown as MockUrlTree;
      expect(result.commands).toEqual(['/login']);
      expect(result.extras).toEqual({ queryParams: { returnUrl: '/app/operator/routes' } });
    });

    it('allows access when authenticated', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      const state = { url: '/app/operator/routes' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, state));
      expect(result).toBe(true);
    });
  });

  describe('capabilityGuard', () => {
    it('redirects to /login if unauthenticated', () => {
      authServiceMock.isAuthenticated.mockReturnValue(false);
      const route = { data: { routeId: 'operator-routes' } } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        capabilityGuard(route, dummyState),
      ) as unknown as MockUrlTree;
      expect(result.commands).toEqual(['/login']);
    });

    it('redirects to default route if capability is missing', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.capabilities.mockReturnValue([]);
      const route = { data: { routeId: 'operator-routes' } } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        capabilityGuard(route, dummyState),
      ) as unknown as MockUrlTree;
      expect(result.commands).toEqual(['/app/backoffice/dashboard']);
    });

    it('allows navigation if user has required capability', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.capabilities.mockReturnValue([{ resource: 'routes', action: 'read' }]);
      const route = { data: { routeId: 'operator-routes' } } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => capabilityGuard(route, dummyState));
      expect(result).toBe(true);
    });

    it('redirects to /app/forbidden without logout if defaultRoute equals current failing route', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.capabilities.mockReturnValue([]);
      authServiceMock.getDefaultRoute.mockReturnValue('/app/backoffice/dashboard');
      const route = {
        data: { routeId: 'backoffice-dashboard' },
      } as unknown as ActivatedRouteSnapshot;
      const state = { url: '/app/backoffice/dashboard' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        capabilityGuard(route, state),
      ) as unknown as MockUrlTree;
      expect(result.commands).toEqual(['/app/forbidden']);
      expect(authServiceMock.logout).not.toHaveBeenCalled();
    });
  });

  describe('contextGuard', () => {
    it('allows route when context matches route definition', () => {
      const route = {
        data: { routeId: 'operator-routes', context: 'operator' },
      } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => contextGuard(route, dummyState));
      expect(result).toBe(true);
    });

    it('redirects to default route when context mismatches route definition', () => {
      const route = {
        data: { routeId: 'operator-routes', context: 'backoffice' },
      } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        contextGuard(route, dummyState),
      ) as unknown as MockUrlTree;
      expect(result.commands).toEqual(['/app/backoffice/dashboard']);
    });

    it('redirects to /app/forbidden if context mismatches and defaultRoute equals current route', () => {
      authServiceMock.getDefaultRoute.mockReturnValue('/app/current');
      const route = {
        data: { routeId: 'operator-routes', context: 'backoffice' },
      } as unknown as ActivatedRouteSnapshot;
      const state = { url: '/app/current' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        contextGuard(route, state),
      ) as unknown as MockUrlTree;
      expect(result.commands).toEqual(['/app/forbidden']);
    });
  });

  describe('guestGuard', () => {
    it('allows navigation when unauthenticated', () => {
      authServiceMock.isAuthenticated.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => guestGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });

    it('redirects authenticated user to default route', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      const result = TestBed.runInInjectionContext(() =>
        guestGuard(dummyRoute, dummyState),
      ) as unknown as MockUrlTree;
      expect(result.commands).toEqual(['/app/backoffice/dashboard']);
    });

    it('redirects to /app/forbidden if authenticated user has no capabilities and defaultRoute is /login', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.getDefaultRoute.mockReturnValue('/login');
      const result = TestBed.runInInjectionContext(() =>
        guestGuard(dummyRoute, dummyState),
      ) as unknown as MockUrlTree;
      expect(result.commands).toEqual(['/app/forbidden']);
      expect(authServiceMock.logout).not.toHaveBeenCalled();
    });
  });
});
