import { SessionCapabilityGrant } from '../models/auth.model';

export type AppContext = 'operator' | 'backoffice';

export type AppRouteId =
  | 'operator-routes'
  | 'operator-readings'
  | 'operator-novelties'
  | 'operator-novelties-new'
  | 'operator-sync'
  | 'backoffice-dashboard';

export interface RouteCapabilityRequirement {
  resource: string;
  action: string;
}

export interface AppRouteDefinition {
  routeId: AppRouteId;
  context: AppContext;
  canonicalPath: string;
  requiredCapability: RouteCapabilityRequirement;
  label: string;
  icon: string;
  breadcrumb: string;
  showInSidebar: boolean;
  showInBottomNav: boolean;
  bottomNavOrder?: number;
  syncBadge?: boolean;
}

export const APP_ROUTE_REGISTRY: Record<AppRouteId, AppRouteDefinition> = {
  'operator-routes': {
    routeId: 'operator-routes',
    context: 'operator',
    canonicalPath: '/app/operator/routes',
    requiredCapability: { resource: 'routes', action: 'read' },
    label: 'Rutas',
    icon: 'bi-map-fill',
    breadcrumb: 'Rutas',
    showInSidebar: true,
    showInBottomNav: true,
    bottomNavOrder: 10,
    syncBadge: false,
  },
  'operator-readings': {
    routeId: 'operator-readings',
    context: 'operator',
    canonicalPath: '/app/operator/readings',
    requiredCapability: { resource: 'lecturas', action: 'read' },
    label: 'Lecturas',
    icon: 'bi-card-checklist',
    breadcrumb: 'Lecturas',
    showInSidebar: true,
    showInBottomNav: true,
    bottomNavOrder: 20,
    syncBadge: false,
  },
  'operator-novelties': {
    routeId: 'operator-novelties',
    context: 'operator',
    canonicalPath: '/app/operator/novelties',
    requiredCapability: { resource: 'work-order-novelties', action: 'read' },
    label: 'Novedades',
    icon: 'bi-exclamation-triangle',
    breadcrumb: 'Novedades',
    showInSidebar: true,
    showInBottomNav: true,
    bottomNavOrder: 30,
    syncBadge: false,
  },
  'operator-novelties-new': {
    routeId: 'operator-novelties-new',
    context: 'operator',
    canonicalPath: '/app/operator/novelties/new',
    requiredCapability: { resource: 'work-order-novelties', action: 'create' },
    label: 'Nueva Novedad',
    icon: 'bi-plus-circle',
    breadcrumb: 'Nueva Novedad',
    showInSidebar: false,
    showInBottomNav: false,
    syncBadge: false,
  },
  'operator-sync': {
    routeId: 'operator-sync',
    context: 'operator',
    canonicalPath: '/app/operator/sync',
    requiredCapability: { resource: 'operator-sync', action: 'read' },
    label: 'Sincronizar',
    icon: 'bi-cloud-arrow-up',
    breadcrumb: 'Sincronizar',
    showInSidebar: true,
    showInBottomNav: true,
    bottomNavOrder: 40,
    syncBadge: true,
  },
  'backoffice-dashboard': {
    routeId: 'backoffice-dashboard',
    context: 'backoffice',
    canonicalPath: '/app/backoffice/dashboard',
    requiredCapability: { resource: 'dashboard', action: 'read' },
    label: 'Dashboard',
    icon: 'bi-speedometer2',
    breadcrumb: 'Dashboard',
    showInSidebar: true,
    showInBottomNav: false,
    syncBadge: false,
  },
};

export function getRouteDefinition(
  routeId: string | null | undefined,
): AppRouteDefinition | undefined {
  if (!routeId) return undefined;
  return APP_ROUTE_REGISTRY[routeId as AppRouteId];
}

export function getAllRoutes(): AppRouteDefinition[] {
  return Object.values(APP_ROUTE_REGISTRY);
}

export function getRoutesByContext(context: AppContext): AppRouteDefinition[] {
  return getAllRoutes().filter((route) => route.context === context);
}

export function hasCapability(
  capabilities: SessionCapabilityGrant[] | undefined | null,
  requirement: RouteCapabilityRequirement,
): boolean {
  if (!capabilities || !Array.isArray(capabilities)) return false;
  return capabilities.some(
    (c) => c.resource === requirement.resource && c.action === requirement.action,
  );
}

export function isRouteAllowed(
  routeId: string | null | undefined,
  capabilities: SessionCapabilityGrant[] | undefined | null,
): boolean {
  const route = getRouteDefinition(routeId);
  if (!route) return false;
  return hasCapability(capabilities, route.requiredCapability);
}

export function getVisibleSidebarRoutes(
  context: AppContext,
  capabilities: SessionCapabilityGrant[] | undefined | null,
): AppRouteDefinition[] {
  return getRoutesByContext(context).filter(
    (r) => r.showInSidebar && hasCapability(capabilities, r.requiredCapability),
  );
}

export function getBottomNavRoutes(
  context: AppContext,
  capabilities: SessionCapabilityGrant[] | undefined | null,
): AppRouteDefinition[] {
  if (context !== 'operator') return [];
  return getRoutesByContext('operator')
    .filter((r) => r.showInBottomNav && hasCapability(capabilities, r.requiredCapability))
    .sort((a, b) => (a.bottomNavOrder ?? 99) - (b.bottomNavOrder ?? 99))
    .slice(0, 5);
}

export function getDefaultRouteByCapabilities(
  capabilities: SessionCapabilityGrant[] | undefined | null,
): string | null {
  if (!capabilities || !Array.isArray(capabilities) || capabilities.length === 0) return null;
  if (isRouteAllowed('backoffice-dashboard', capabilities)) {
    return APP_ROUTE_REGISTRY['backoffice-dashboard'].canonicalPath;
  }
  if (isRouteAllowed('operator-routes', capabilities)) {
    return APP_ROUTE_REGISTRY['operator-routes'].canonicalPath;
  }
  const anyAllowed = getAllRoutes().find((r) => hasCapability(capabilities, r.requiredCapability));
  return anyAllowed ? anyAllowed.canonicalPath : null;
}

const OPERATOR_RESOURCES = new Set(['routes', 'lecturas', 'work-order-novelties', 'operator-sync']);

export function canAccessContext(
  context: AppContext,
  capabilities: SessionCapabilityGrant[] | undefined | null,
): boolean {
  if (!capabilities || !Array.isArray(capabilities) || capabilities.length === 0) return false;
  if (context === 'operator') {
    return capabilities.some((c) => OPERATOR_RESOURCES.has(c.resource));
  }
  return capabilities.some(
    (c) => !OPERATOR_RESOURCES.has(c.resource) || c.resource === 'dashboard',
  );
}

export function getDefaultRouteForContext(
  context: AppContext,
  capabilities: SessionCapabilityGrant[] | undefined | null,
): string | null {
  if (!capabilities || !Array.isArray(capabilities) || capabilities.length === 0) return null;
  const routes = getRoutesByContext(context);
  const allowed = routes.find((r) => hasCapability(capabilities, r.requiredCapability));
  if (allowed) return allowed.canonicalPath;
  return context === 'operator' ? '/app/operator/routes' : '/app/backoffice/dashboard';
}
