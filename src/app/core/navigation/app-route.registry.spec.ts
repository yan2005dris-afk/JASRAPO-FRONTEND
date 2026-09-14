import { describe, it, expect } from 'vitest';
import {
  APP_ROUTE_REGISTRY,
  getRouteDefinition,
  getRoutesByContext,
  getVisibleSidebarRoutes,
  getBottomNavRoutes,
  getDefaultRouteByCapabilities,
  canAccessContext,
  hasCapability,
  isRouteAllowed,
} from './app-route.registry';

describe('AppRouteRegistry', () => {
  const operatorCaps = [{ resource: 'routes', action: 'read' }];
  const backofficeCaps = [{ resource: 'dashboard', action: 'read' }];

  it('retrieves route definition by routeId', () => {
    expect(getRouteDefinition('operator-routes')?.canonicalPath).toBe('/app/operator/routes');
    expect(getRouteDefinition(undefined)).toBeUndefined();
  });

  it('filters routes by context', () => {
    const opRoutes = getRoutesByContext('operator');
    const boRoutes = getRoutesByContext('backoffice');
    expect(opRoutes.every((r) => r.context === 'operator')).toBe(true);
    expect(boRoutes.every((r) => r.context === 'backoffice')).toBe(true);
  });

  it('validates capabilities strictly and fails closed when empty', () => {
    expect(hasCapability([], { resource: 'routes', action: 'read' })).toBe(false);
    expect(hasCapability(null, { resource: 'routes', action: 'read' })).toBe(false);
    expect(hasCapability(operatorCaps, { resource: 'routes', action: 'read' })).toBe(true);
    expect(isRouteAllowed('operator-routes', operatorCaps)).toBe(true);
    expect(isRouteAllowed('operator-routes', backofficeCaps)).toBe(false);
  });

  it('returns bottom nav routes only for operator and limits to 5 items', () => {
    expect(getBottomNavRoutes('backoffice', backofficeCaps)).toEqual([]);
    const allCaps = Object.values(APP_ROUTE_REGISTRY).map((r) => r.requiredCapability);
    const opNav = getBottomNavRoutes('operator', allCaps);
    expect(opNav.length).toBeLessThanOrEqual(5);
    expect(opNav.every((r) => r.context === 'operator' && r.showInBottomNav)).toBe(true);
    expect(opNav.map((r) => r.routeId)).toContain('operator-profile');
  });

  it('resolves default route by capabilities and falls back to null when missing', () => {
    expect(getDefaultRouteByCapabilities(operatorCaps)).toBe('/app/operator/routes');
    expect(getDefaultRouteByCapabilities(backofficeCaps)).toBe('/app/backoffice/dashboard');
    expect(getDefaultRouteByCapabilities([])).toBeNull();
  });

  it('filters sidebar routes by context and capabilities', () => {
    const opSidebar = getVisibleSidebarRoutes('operator', operatorCaps);
    expect(opSidebar.map((r) => r.routeId)).toContain('operator-routes');
    expect(opSidebar.map((r) => r.routeId)).not.toContain('backoffice-dashboard');
  });

  it('checks context access declaratively by required route capabilities without heuristics', () => {
    expect(canAccessContext('operator', operatorCaps)).toBe(true);
    expect(canAccessContext('backoffice', operatorCaps)).toBe(false);
    expect(canAccessContext('backoffice', backofficeCaps)).toBe(true);
    expect(canAccessContext('operator', backofficeCaps)).toBe(false);

    // Dual area user
    const dualCaps = [...operatorCaps, ...backofficeCaps];
    expect(canAccessContext('operator', dualCaps)).toBe(true);
    expect(canAccessContext('backoffice', dualCaps)).toBe(true);

    // Empty capabilities fail closed
    expect(canAccessContext('operator', [])).toBe(false);
    expect(canAccessContext('backoffice', [])).toBe(false);
  });
});
