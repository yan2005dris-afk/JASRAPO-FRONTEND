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

// Backward compatibility alias during migration
export type TaskResponse = OperatorRouteResponse;
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
