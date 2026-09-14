import { SessionCapabilityGrant } from '../models/auth.model';

export type AppContext = 'operator' | 'backoffice';

export type AppRouteId =
  | 'operator-routes'
  | 'operator-readings'
  | 'operator-novelties'
  | 'operator-novelties-new'
  | 'operator-sync'
  | 'operator-profile'
  | 'backoffice-dashboard'
  | 'backoffice-clients'
  | 'backoffice-contracts'
  | 'backoffice-meters'
  | 'backoffice-tariffs'
  | 'backoffice-communities'
  | 'backoffice-payments'
  | 'backoffice-reports'
  | 'backoffice-users'
  | 'backoffice-roles';

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
  'operator-profile': {
    routeId: 'operator-profile',
    context: 'operator',
    canonicalPath: '/app/operator/profile',
    requiredCapability: { resource: 'profile', action: 'read' },
    label: 'Perfil',
    icon: 'bi-person-circle',
    breadcrumb: 'Perfil',
    showInSidebar: false,
    showInBottomNav: true,
    bottomNavOrder: 50,
    syncBadge: false,
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
  'backoffice-clients': {
    routeId: 'backoffice-clients',
    context: 'backoffice',
    canonicalPath: '/app/contracts/clients',
    requiredCapability: { resource: 'clientes', action: 'read' },
    label: 'Clientes',
    icon: 'bi-people',
    breadcrumb: 'Clientes',
    showInSidebar: true,
    showInBottomNav: false,
  },
  'backoffice-contracts': {
    routeId: 'backoffice-contracts',
    context: 'backoffice',
    canonicalPath: '/app/contracts/service-contracts',
    requiredCapability: { resource: 'contracts', action: 'read' },
    label: 'Contratos',
    icon: 'bi-file-earmark-text',
    breadcrumb: 'Contratos',
    showInSidebar: true,
    showInBottomNav: false,
  },
  'backoffice-meters': {
    routeId: 'backoffice-meters',
    context: 'backoffice',
    canonicalPath: '/app/contracts/meters',
    requiredCapability: { resource: 'meters', action: 'read' },
    label: 'Medidores',
    icon: 'bi-speedometer',
    breadcrumb: 'Medidores',
    showInSidebar: true,
    showInBottomNav: false,
  },
  'backoffice-tariffs': {
    routeId: 'backoffice-tariffs',
    context: 'backoffice',
    canonicalPath: '/app/contracts/tariffs',
    requiredCapability: { resource: 'tarifas', action: 'read' },
    label: 'Tarifas',
    icon: 'bi-tags',
    breadcrumb: 'Tarifas',
    showInSidebar: true,
    showInBottomNav: false,
  },
  'backoffice-communities': {
    routeId: 'backoffice-communities',
    context: 'backoffice',
    canonicalPath: '/app/admin/comunidades',
    requiredCapability: { resource: 'comunidades', action: 'read' },
    label: 'Comunidades',
    icon: 'bi-geo-alt',
    breadcrumb: 'Comunidades',
    showInSidebar: true,
    showInBottomNav: false,
  },
  'backoffice-payments': {
    routeId: 'backoffice-payments',
    context: 'backoffice',
    canonicalPath: '/app/billing/payments',
    requiredCapability: { resource: 'payments', action: 'read' },
    label: 'Cobros',
    icon: 'bi-cash-coin',
    breadcrumb: 'Cobros',
    showInSidebar: true,
    showInBottomNav: false,
  },
  'backoffice-reports': {
    routeId: 'backoffice-reports',
    context: 'backoffice',
    canonicalPath: '/app/reports/zone-consumption',
    requiredCapability: { resource: 'reportes', action: 'read' },
    label: 'Reportes',
    icon: 'bi-graph-up',
    breadcrumb: 'Reportes',
    showInSidebar: true,
    showInBottomNav: false,
  },
  'backoffice-users': {
    routeId: 'backoffice-users',
    context: 'backoffice',
    canonicalPath: '/app/admin/users',
    requiredCapability: { resource: 'users', action: 'read' },
    label: 'Usuarios',
    icon: 'bi-person-badge',
    breadcrumb: 'Usuarios',
    showInSidebar: true,
    showInBottomNav: false,
  },
  'backoffice-roles': {
    routeId: 'backoffice-roles',
    context: 'backoffice',
    canonicalPath: '/app/admin/roles',
    requiredCapability: { resource: 'roles', action: 'read' },
    label: 'Roles',
    icon: 'bi-shield-check',
    breadcrumb: 'Roles',
    showInSidebar: true,
    showInBottomNav: false,
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

export function canAccessContext(
  context: AppContext,
  capabilities: SessionCapabilityGrant[] | undefined | null,
): boolean {
  if (!capabilities || !Array.isArray(capabilities) || capabilities.length === 0) return false;
  return getRoutesByContext(context).some((route) =>
    hasCapability(capabilities, route.requiredCapability),
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
