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
  return items.flatMap((item) => {
    if (isUnfinishedReportRoute(item.route)) return [];

    const children = filterUnavailableReportMenuItems(item.children ?? []);
    if (!item.route && children.length === 0) return [];

    return [{ ...item, children: children.length > 0 ? children : undefined }];
  });
}
