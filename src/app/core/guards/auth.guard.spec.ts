import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { authGuard, adminCapabilityGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('Auth Guards', () => {
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isOperator: ReturnType<typeof vi.fn>;
    isAdminOrSupervisor: ReturnType<typeof vi.fn>;
    canAccessOperatorRoutes: ReturnType<typeof vi.fn>;
    getDefaultRoute: ReturnType<typeof vi.fn>;
  };
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/' } as RouterStateSnapshot;

  beforeEach(() => {
    routerMock = {
      navigate: vi.fn(),
    };

    authServiceMock = {
      isAuthenticated: vi.fn(() => false),
      isOperator: vi.fn(() => false),
      isAdminOrSupervisor: vi.fn(() => false),
      canAccessOperatorRoutes: vi.fn(() => false),
      getDefaultRoute: vi.fn(() => '/app/dashboard'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
  });

  describe('authGuard', () => {
    it('should redirect to /login when user is not authenticated', () => {
      authServiceMock.isAuthenticated.mockReturnValue(false);
      const state = { url: '/app/dashboard' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, state));

      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/app/dashboard' },
      });
    });

    it('should redirect operator trying to access administrative routes to /app/operador/rutas', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isOperator.mockReturnValue(true);
      const state = { url: '/app/admin/users' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, state));

      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/app/operador/rutas']);
    });

    it('should redirect user without operator capability trying to access /app/operador to /app/dashboard', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isOperator.mockReturnValue(false);
      authServiceMock.canAccessOperatorRoutes.mockReturnValue(false);
      const state = { url: '/app/operador/rutas' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, state));

      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/app/dashboard']);
    });

    it('should allow admin/supervisor with operator capability to access /app/operador', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isOperator.mockReturnValue(false);
      authServiceMock.canAccessOperatorRoutes.mockReturnValue(true);
      const state = { url: '/app/operador/rutas' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, state));

      expect(result).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should allow authenticated non-operator to access common /app routes', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isOperator.mockReturnValue(false);
      const state = { url: '/app/dashboard' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, state));

      expect(result).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('adminCapabilityGuard', () => {
    it('should redirect to /login when not authenticated', () => {
      authServiceMock.isAuthenticated.mockReturnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        adminCapabilityGuard(dummyRoute, dummyState),
      );

      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should redirect to default route when user is not admin or supervisor', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isAdminOrSupervisor.mockReturnValue(false);
      authServiceMock.getDefaultRoute.mockReturnValue('/app/operador/rutas');

      const result = TestBed.runInInjectionContext(() =>
        adminCapabilityGuard(dummyRoute, dummyState),
      );

      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/app/operador/rutas']);
    });

    it('should allow access when user is admin or supervisor', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isAdminOrSupervisor.mockReturnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        adminCapabilityGuard(dummyRoute, dummyState),
      );

      expect(result).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('guestGuard', () => {
    it('should allow navigation when user is not authenticated', () => {
      authServiceMock.isAuthenticated.mockReturnValue(false);

      const result = TestBed.runInInjectionContext(() => guestGuard(dummyRoute, dummyState));

      expect(result).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should redirect authenticated user to default route', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.getDefaultRoute.mockReturnValue('/app/dashboard');

      const result = TestBed.runInInjectionContext(() => guestGuard(dummyRoute, dummyState));

      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/app/dashboard']);
    });
  });
});
