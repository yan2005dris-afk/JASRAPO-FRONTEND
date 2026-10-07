export type RouteType = 'LECTURA' | 'RECONEXION' | 'INSTALACION' | 'INSPECCION';
export type RouteState = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
export type WorkOrderActivityType = 'LECTURA' | 'INSTALACION' | 'RECONEXION' | 'INSPECCION';
export type WorkOrderState = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA' | 'FALLIDA';

export interface OperatorActivityType {
  tipoActividadId: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  icono?: string | null;
  activo: boolean;
}

export interface OperatorMeterInfo {
  medidorId: string;
  serie: string;
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
  latitud?: number;
  longitud?: number;
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
  operarioId: number;
  comunidadId: number;
  comunidadNombre?: string;
  sectorId?: number;
  sectorNombre?: string;
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

export interface AnomaliaItem {
  tipo: string;
  observacion: string;
  estado: string;
}

export interface ReadingWithAnomaly {
  lecturaId: string | null;
  medidorId: string | null;
  medidorSerie: string;
  fecha: string;
  estado: string;
  anomalias: AnomaliaItem[];
}

export interface OperatorNovelty {
  novedadId: string;
  ordenTrabajoId: string;
  lecturaId: string | null;
  medidorId: string | null;
  medidorSerie: string;
  contratoId: string;
  numeroGuia: string;
  clienteNombre: string;
  direccionSuministro: string;
  comunidadId: number | null;
  comunidadNombre: string | null;
  sectorId: number | null;
  sectorNombre: string | null;
  tipo: string;
  observacion: string | null;
  estado: string;
  fotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
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
  NOVELTY: 'novelty',
} as const;
export type ManifestEntityType = (typeof MANIFEST_ENTITY_TYPE)[keyof typeof MANIFEST_ENTITY_TYPE];

export const MANIFEST_PHYSICAL_ENTITY_TYPE = {
  ROUTES: 'rutas',
  WORK_ORDERS: 'ordenes_trabajo',
  METERS: 'medidores',
  READINGS: 'lecturas',
  READING_ANOMALY: 'lectura_anomalia',
  WORK_ORDER_NOVELTY: 'novedad_orden_trabajo',
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
// v3 fuerza una descarga completa para renovar nombres de clientes de medidores ya cacheados.
export const MANIFEST_PROTOCOL_VERSION = 3;

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
