import type { OperatorRouteResponse, OperatorWorkOrder } from '../models/operator.models';

const READING_ROUTE_TYPES = new Set(['LECTURA', 'LECTURA']);

/**
 * The backend uses LECTURA, while older cached records may still contain LECTURA.
 * Treat both values as the same route type until those local caches are replaced.
 */
export function isReadingRouteType(value: string | null | undefined): boolean {
  return value != null && READING_ROUTE_TYPES.has(value);
}

export function routeMatchesTypeFilter(routeType: string, filter: string): boolean {
  if (filter === 'ALL') return true;
  if (isReadingRouteType(filter)) return isReadingRouteType(routeType);
  return routeType === filter;
}

/**
 * Canonical client-side visit order — the same order the online endpoint GET /operator/routes
 * delivers (comunidadId → sectorId → rutaId). It is the single source of ordering for the list,
 * the offline cache and the map, so all three always agree.
 */
export function compareRoutesCanonically(
  a: OperatorRouteResponse,
  b: OperatorRouteResponse,
): number {
  const comunidadDelta = (a.comunidadId ?? 0) - (b.comunidadId ?? 0);
  if (comunidadDelta !== 0) return comunidadDelta;
  const sectorDelta = (a.sectorId ?? 0) - (b.sectorId ?? 0);
  if (sectorDelta !== 0) return sectorDelta;
  return a.rutaId.localeCompare(b.rutaId, undefined, { numeric: true });
}

/**
 * Next stop of a route = first PENDIENTE work order ordered by ordenVisita ascending
 * (the administrative visit order that matches the paper field sheet) that carries contract
 * coordinates on the backend payload. The badge is INFORMATIVE, not prescriptive:
 * the operator decides. Deliberately NOT minimum Haversine distance.
 */
export function nextPendingWorkOrder(task: OperatorRouteResponse): OperatorWorkOrder | null {
  const pendingWithCoords = (task.ordenesTrabajo ?? []).filter(
    (order) =>
      order.estado === 'PENDIENTE' &&
      order.contrato?.latitud != null &&
      order.contrato?.longitud != null,
  );
  return pendingWithCoords.sort((a, b) => a.ordenVisita - b.ordenVisita)[0] ?? null;
}
