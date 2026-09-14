import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { NetworkService } from './core/services/network.service';
import { OperatorSyncService } from './core/services/operator-sync.service';

describe('App Routes and Layout Contexts', () => {
  let router: Router;
  let location: Location;

  const mockCapabilitiesSignal = signal<{ resource: string; action: string }[]>([]);
  const mockIsAuthenticatedSignal = signal(true);

  const mockAuthService = {
    isAuthenticated: mockIsAuthenticatedSignal,
    capabilities: mockCapabilitiesSignal,
    currentUser: signal({ id: 1, name: 'Test User', email: 'test@test.com' }),
    hasCapability: vi.fn((req) =>
      mockCapabilitiesSignal().some((c) => c.resource === req.resource && c.action === req.action),
    ),
    getDefaultRoute: vi.fn(() => {
      const caps = mockCapabilitiesSignal();
      if (caps.some((c) => c.resource === 'routes')) return '/app/operator/routes';
      if (caps.some((c) => c.resource === 'dashboard')) return '/app/backoffice/dashboard';
      return '/app/forbidden';
    }),
    logout: vi.fn(),
  };

  const mockNetworkService = {
    isOnline: signal(true),
  };

  const mockSyncService = {
    totalPending: signal(0),
    totalQueued: signal(0),
    isSyncing: signal(false),
  };

  beforeEach(async () => {
    mockCapabilitiesSignal.set([
      { resource: 'routes', action: 'read' },
      { resource: 'lecturas', action: 'read' },
      { resource: 'work-order-novelties', action: 'read' },
      { resource: 'operator-sync', action: 'read' },
      { resource: 'profile', action: 'read' },
      { resource: 'dashboard', action: 'read' },
    ]);
    mockIsAuthenticatedSignal.set(true);
    mockAuthService.logout.mockClear();

    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: mockAuthService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: OperatorSyncService, useValue: mockSyncService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  describe('Canonical routes navigation', () => {
    it('navigates to canonical /app/operator/routes', async () => {
      await router.navigateByUrl('/app/operator/routes');
      expect(location.path()).toBe('/app/operator/routes');
    });

    it('navigates to canonical /app/operator/readings', async () => {
      await router.navigateByUrl('/app/operator/readings');
      expect(location.path()).toBe('/app/operator/readings');
    });

    it('navigates to canonical /app/operator/novelties', async () => {
      await router.navigateByUrl('/app/operator/novelties');
      expect(location.path()).toBe('/app/operator/novelties');
    });

    it('navigates to canonical /app/operator/sync', async () => {
      await router.navigateByUrl('/app/operator/sync');
      expect(location.path()).toBe('/app/operator/sync');
    });

    it('navigates to canonical /app/operator/profile', async () => {
      await router.navigateByUrl('/app/operator/profile');
      expect(location.path()).toBe('/app/operator/profile');
    });

    it('navigates to canonical /app/backoffice/dashboard', async () => {
      await router.navigateByUrl('/app/backoffice/dashboard');
      expect(location.path()).toBe('/app/backoffice/dashboard');
    });
  });

  describe('Authorization denial without logout', () => {
    it('redirects to accessible default route on missing capability without calling logout', async () => {
      // User only has operator routes capability
      mockCapabilitiesSignal.set([{ resource: 'routes', action: 'read' }]);
      mockAuthService.hasCapability.mockImplementation((req) => req.resource === 'routes');

      await router.navigateByUrl('/app/backoffice/dashboard');

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockIsAuthenticatedSignal()).toBe(true);
      expect(location.path()).toBe('/app/operator/routes');
    });

    it('redirects to /app/forbidden when user has no accessible route without calling logout', async () => {
      // User has no valid capabilities
      mockCapabilitiesSignal.set([]);
      mockAuthService.hasCapability.mockReturnValue(false);

      await router.navigateByUrl('/app/backoffice/dashboard');

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockIsAuthenticatedSignal()).toBe(true);
      expect(location.path()).toBe('/app/forbidden');
    });
  });
});
