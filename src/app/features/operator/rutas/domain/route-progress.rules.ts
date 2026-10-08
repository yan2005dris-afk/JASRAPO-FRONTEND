import type { OperatorRouteResponse, RouteType } from './operator.models';

/**
 * Resolves the primary route type from an OperatorRouteResponse.
 */
export function resolveRouteType(task: OperatorRouteResponse): RouteType {
  if (task?.tipoRuta) return task.tipoRuta;
  if (task?.paradas?.length && task.paradas[0].tipoActividad) {
    return task.paradas[0].tipoActividad as RouteType;
  }
  if (task?.ordenesTrabajo?.length && task.ordenesTrabajo[0].tipoActividad) {
    return task.ordenesTrabajo[0].tipoActividad as RouteType;
  }
  return 'LECTURA';
}

/**
 * Counts total points (stops / work orders) in a route.
 */
export function getRoutePointCount(task: OperatorRouteResponse): number {
  if (task.paradas?.length) return task.paradas.length;
  if (task.ordenesTrabajo?.length) return task.ordenesTrabajo.length;
  if (task.rutaPuntos?.length) return task.rutaPuntos.length;
  return 0;
}

/**
 * Counts how many items in the route have already been executed/read.
 */
export function getRouteCompletedCount(
  task: OperatorRouteResponse,
  readingStatusBySerie: ReadonlyMap<string, string>,
): number {
  let count = 0;

  if (task.paradas?.length) {
    for (const p of task.paradas) {
      const st = readingStatusBySerie.get(p.serie ?? '') ?? p.estado;
      if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__' && st !== 'RECHAZADA_VERIFICACION') {
        count++;
      }
    }
  } else if (task.ordenesTrabajo?.length) {
    for (const o of task.ordenesTrabajo) {
      const serie =
        o.medidor?.serie ||
        (o.contrato?.numeroContrato ? String(o.contrato.numeroContrato) : `OT-${o.ordenTrabajoId}`);
      const st =
        readingStatusBySerie.get(serie) ||
        readingStatusBySerie.get(o.medidor?.serie ?? '') ||
        (o.ordenTrabajoId ? readingStatusBySerie.get(String(o.ordenTrabajoId)) : null) ||
        (o.medidor?.medidorId ? readingStatusBySerie.get(String(o.medidor.medidorId)) : null) ||
        o.estado;
      if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__' && st !== 'RECHAZADA_VERIFICACION') {
        count++;
      }
    }
  } else if (task.medidor) {
    const st = readingStatusBySerie.get(task.medidor.serie);
    if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__' && st !== 'RECHAZADA_VERIFICACION') {
      count = 1;
    }
  }

  return count;
}

/**
 * Calculates percentage of route completion.
 */
export function getRouteProgressPct(
  task: OperatorRouteResponse,
  readingStatusBySerie: ReadonlyMap<string, string>,
): number {
  const total = getRoutePointCount(task);
  if (total === 0) return 0;
  const completed = getRouteCompletedCount(task, readingStatusBySerie);
  return Math.min(100, Math.round((completed / total) * 100));
}
