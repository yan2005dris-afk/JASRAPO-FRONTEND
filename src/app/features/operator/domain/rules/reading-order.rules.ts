import type {
  OperatorRouteResponse,
  OperatorWorkOrder,
  WorkOrderActivityType,
  WorkOrderState,
} from '../models/operator.models';
import type { IMeterDto } from '../../../contracts/meters/domain/models/meter.model';

export interface AssignedWorkOrder {
  id: string;
  estado: WorkOrderState;
  lecturaId?: string;
}

export interface ReadingRecord {
  lecturaId?: string;
  _lecturaId?: string;
  medidorId?: string | number;
  medidor?: { medidorId?: string | number; serie?: string };
  lecturaActual?: number;
  lecturaAnterior?: number;
  estado?: string;
  syncState?: string;
  contratoId?: string | number;
  [key: string]: unknown;
}

const READING_ROUTE_TYPES = new Set(['LECTURA']);

/**
 * Checks whether a route type represents meter readings.
 */
export function isReadingRouteType(value: string | null | undefined): boolean {
  return value != null && READING_ROUTE_TYPES.has(value);
}

/**
 * Checks whether a route matches the selected route-type filter.
 */
export function routeMatchesTypeFilter(routeType: string, filter: string): boolean {
  if (filter === 'ALL') return true;
  if (isReadingRouteType(filter)) return isReadingRouteType(routeType);
  return routeType === filter;
}

/**
 * Canonical client-side visit order (comunidadId -> sectorId -> rutaId).
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
 * Next pending work order for navigation.
 */
export function nextPendingWorkOrder(task: OperatorRouteResponse): OperatorWorkOrder | null {
  const pendingWithCoords: OperatorWorkOrder[] = (task.ordenesTrabajo ?? []).filter(
    (order: OperatorWorkOrder) =>
      order.estado === 'PENDIENTE' &&
      order.contrato?.latitud != null &&
      order.contrato?.longitud != null,
  );
  return pendingWithCoords.sort((a: OperatorWorkOrder, b: OperatorWorkOrder) => a.ordenVisita - b.ordenVisita)[0] ?? null;
}

/**
 * Resolves the reading/order status record for a given meter by searching:
 * 1) medidorId
 * 2) serie
 * 3) contratoId
 * 4) numeroGuia
 * 5) ordenTrabajoId or OT-{id}
 */
export function resolveOrderRecord(
  meter: IMeterDto,
  existingReadingMap: ReadonlyMap<string, ReadingRecord>,
  workOrdersByMeter?: ReadonlyMap<string, ReadonlyMap<WorkOrderActivityType, AssignedWorkOrder>>,
): ReadingRecord | undefined {
  if (meter.medidorId != null && existingReadingMap.has(meter.medidorId.toString())) {
    return existingReadingMap.get(meter.medidorId.toString());
  }
  if (meter.serie && existingReadingMap.has(meter.serie)) {
    return existingReadingMap.get(meter.serie);
  }
  if (meter.contratoId != null && existingReadingMap.has(meter.contratoId.toString())) {
    return existingReadingMap.get(meter.contratoId.toString());
  }
  if (meter.numeroGuia && existingReadingMap.has(meter.numeroGuia)) {
    return existingReadingMap.get(meter.numeroGuia);
  }

  if (workOrdersByMeter) {
    const assignments = workOrdersByMeter.get(meter.serie);
    if (assignments) {
      for (const wo of assignments.values()) {
        if (wo.id && existingReadingMap.has(wo.id)) return existingReadingMap.get(wo.id);
        if (wo.id && existingReadingMap.has(`OT-${wo.id}`)) return existingReadingMap.get(`OT-${wo.id}`);
        if (wo.lecturaId && existingReadingMap.has(wo.lecturaId)) return existingReadingMap.get(wo.lecturaId);
      }
    }
  }

  return undefined;
}

/**
 * Pure evaluation of whether a meter/order has been completed or attended.
 */
export function isOrderCompletedRule(params: {
  meter: IMeterDto;
  existingRecord?: ReadingRecord;
  completedWorkOrderIds?: ReadonlySet<string>;
  readMetersIds?: ReadonlySet<string>;
  workOrdersByMeter?: ReadonlyMap<string, ReadonlyMap<WorkOrderActivityType, AssignedWorkOrder>>;
}): boolean {
  const { meter, existingRecord, completedWorkOrderIds, readMetersIds, workOrdersByMeter } = params;

  if (existingRecord) {
    if (existingRecord.estado === 'RECHAZADA_VERIFICACION' || existingRecord.estado === 'PENDIENTE') {
      return false;
    }
    return true;
  }

  const mIdStr = meter.medidorId?.toString();
  if (mIdStr && completedWorkOrderIds?.has(mIdStr)) return true;
  if (meter.serie && completedWorkOrderIds?.has(meter.serie)) return true;
  if (mIdStr && readMetersIds?.has(mIdStr)) return true;
  if (meter.serie && readMetersIds?.has(meter.serie)) return true;
  if (meter.numeroGuia && readMetersIds?.has(meter.numeroGuia)) return true;

  if (workOrdersByMeter) {
    const assignments = workOrdersByMeter.get(meter.serie);
    if (assignments && assignments.size > 0) {
      const allCompleted = [...assignments.values()].every((wo) => wo.estado === 'COMPLETADA');
      if (allCompleted) return true;
    }
  }

  return false;
}

/**
 * Filter actionable work orders for an operator on a meter.
 */
export function getActionableWorkOrders(
  meter: IMeterDto,
  workOrdersByMeter: ReadonlyMap<string, ReadonlyMap<WorkOrderActivityType, AssignedWorkOrder>>,
  existingRecord?: ReadingRecord,
): [WorkOrderActivityType, AssignedWorkOrder][] {
  const isRelectura = existingRecord?.estado === 'RECHAZADA_VERIFICACION';
  const isLecturaTaken =
    existingRecord?.estado &&
    existingRecord.estado !== 'PENDIENTE' &&
    existingRecord.estado !== 'RECHAZADA_VERIFICACION';

  return [...(workOrdersByMeter.get(meter.serie)?.entries() ?? [])].filter(
    ([type, workOrder]) => {
      if (type === 'LECTURA') {
        if (isLecturaTaken) return false;
        return (
          workOrder.estado === 'PENDIENTE' ||
          workOrder.estado === 'EN_PROGRESO' ||
          isRelectura
        );
      }
      return workOrder.estado === 'PENDIENTE' || workOrder.estado === 'EN_PROGRESO';
    },
  );
}
