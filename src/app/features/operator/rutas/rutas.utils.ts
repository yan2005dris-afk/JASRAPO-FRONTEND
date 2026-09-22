import type { OperatorRouteResponse, OperatorWorkOrder } from '../models/operator.models';

/**
 * Canonical client-side visit order — the same order the online endpoint GET /operator/routes
 * delivers (comunidadId → sectorId → orden). It is the single source of ordering for the list,
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
  return (a.orden ?? 0) - (b.orden ?? 0);
}

/**
 * Next stop of a route = first PENDIENTE work order ordered by ordenVisita ascending
 * (the administrative visit order that matches the paper field sheet) that carries meter
 * coordinates on the backend payload. The badge is INFORMATIVE, not prescriptive:
 * the operator decides. Deliberately NOT minimum Haversine distance.
 */
export function nextPendingWorkOrder(task: OperatorRouteResponse): OperatorWorkOrder | null {
  const pendingWithCoords = (task.ordenesTrabajo ?? []).filter(
    (order) =>
      order.estado === 'PENDIENTE' &&
      order.medidor?.latitud != null &&
      order.medidor?.longitud != null,
  );
  return pendingWithCoords.sort((a, b) => a.ordenVisita - b.ordenVisita)[0] ?? null;
}
