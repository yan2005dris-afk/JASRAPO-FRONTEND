export type RouteType = 'TOMA_LECTURA' | 'RECONEXION' | 'INSTALACION' | 'INSPECCION';
export type RouteState = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
export type WorkOrderActivityType = 'LECTURA' | 'INSTALACION' | 'RECONEXION' | 'INSPECCION';
export type WorkOrderState = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA' | 'FALLIDA';

export interface OperatorMeterInfo {
  medidorId: string;
  serie: string;
  latitud?: number;
  longitud?: number;
}

export interface OperatorUserInfo {
  usuarioId: number;
  nombres: string;
  apellidos: string;
}

export interface OperatorWorkOrderContract {
  numeroContrato: string;
  clienteNombre: string;
  direccion: string;
}

export interface OperatorWorkOrder {
  ordenTrabajoId: string;
  rutaId: string;
  tipoActividad: WorkOrderActivityType;
  estado: WorkOrderState;
  ordenVisita: number;
  resultadoObservacion?: string;
  evidenciaFotoUrl?: string;
  completadoEn?: string;
  contratoId: string;
  medidorId?: string;
  lecturaId?: string;
  medidor?: OperatorMeterInfo | null;
  contrato?: OperatorWorkOrderContract;
}

export interface OperatorParada {
  ordenTrabajoId: string;
  tipoActividad: WorkOrderActivityType;
  estado: WorkOrderState;
  latitud: number;
  longitud: number;
  serie?: string;
  clienteNombre?: string;
  direccionSuministro?: string;
}

export interface OperatorRouteResponse {
  rutaId: string;
  tipoRuta: RouteType;
  nombre: string;
  descripcion?: string;
  estado: RouteState;
  orden: number;
  observacion?: string;
  fechaLimite?: string;
  operarioId: number;
  comunidadId: number;
  sectorId?: number;
  fechaPlanificada?: string;
  fechaInicio?: string;
  fechaFin?: string;
  medidor: OperatorMeterInfo | null;
  operario: OperatorUserInfo;
  rutaPuntos?: RoutePoint[];
  ordenesTrabajo?: OperatorWorkOrder[];
  paradas?: OperatorParada[];
}

export interface RoutePoint {
  latitud: number;
  longitud: number;
  serie: string;
  clienteNombre: string;
}

export type TaskRouteType = RouteType;
export type TaskState = RouteState;
export type TaskMedidor = OperatorMeterInfo;
export type TaskOperario = OperatorUserInfo;
export type TaskRutaPunto = RoutePoint;

export interface AnomaliaItem {
  tipo: string;
  observacion: string;
  estado: string;
}

export interface ReadingWithAnomaly {
  lecturaId: string;
  medidorId: string | null;
  medidorSerie: string;
  fecha: string;
  estado: string;
  anomalias: AnomaliaItem[];
}

export const MANIFEST_CHANGE_OPERATION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;
export type ManifestChangeOperation =
  (typeof MANIFEST_CHANGE_OPERATION)[keyof typeof MANIFEST_CHANGE_OPERATION];

export const MANIFEST_ENTITY_TYPE = {
  ROUTE: 'route',
  WORK_ORDER: 'workOrder',
  METER: 'meter',
  READING: 'reading',
  PENDING_ANOMALY: 'pendingAnomaly',
} as const;
export type ManifestEntityType = (typeof MANIFEST_ENTITY_TYPE)[keyof typeof MANIFEST_ENTITY_TYPE];

export const MANIFEST_PHYSICAL_ENTITY_TYPE = {
  ROUTES: 'rutas',
  WORK_ORDERS: 'ordenes_trabajo',
  METERS: 'medidores',
  READINGS: 'lecturas',
  READING_ANOMALY: 'lectura_anomalia',
} as const;
export type ManifestPhysicalEntityType =
  (typeof MANIFEST_PHYSICAL_ENTITY_TYPE)[keyof typeof MANIFEST_PHYSICAL_ENTITY_TYPE];

export interface OperatorManifestChange {
  entityType: string;
  id: string;
  operation: ManifestChangeOperation;
  data?: Record<string, unknown>;
}

export interface OperatorManifestCollectionPage {
  items: Record<string, unknown>[];
  total?: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export type OperatorManifestMode = 'snapshot' | 'incremental';
export const MANIFEST_PROTOCOL_VERSION = 2;

export interface OperatorManifestPage {
  mode: OperatorManifestMode;
  snapshotVersion: string;
  periodId: string;
  cursor: string | null;
  complete: boolean;
  nextCursor: string | null;
  changes: OperatorManifestChange[];
  routes?: OperatorManifestCollectionPage | Record<string, unknown>[];
  workOrders?: OperatorManifestCollectionPage | Record<string, unknown>[];
  meters?: OperatorManifestCollectionPage | Record<string, unknown>[];
  readings?: OperatorManifestCollectionPage | Record<string, unknown>[];
  pendingAnomalies?: OperatorManifestCollectionPage | Record<string, unknown>[];
}
