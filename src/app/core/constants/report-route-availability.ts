import { MenuItem } from '../models/menu.model';

export const UNFINISHED_REPORT_ROUTES = new Set([
  '/app/reportes/consumo-zonas',
  '/app/reportes/dashboard',
  '/app/reportes/recaudacion-morosidad',
]);

export function isUnfinishedReportRoute(route: string | undefined): boolean {
  if (!route) return false;
  const path = route.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  return UNFINISHED_REPORT_ROUTES.has(path);
}

export function filterUnavailableReportMenuItems(items: readonly MenuItem[]): MenuItem[] {
  return items
    .filter((item) => !isUnfinishedReportRoute(item.route))
    .map((item) => ({
      ...item,
      children: item.children ? filterUnavailableReportMenuItems(item.children) : undefined,
    }));
}
