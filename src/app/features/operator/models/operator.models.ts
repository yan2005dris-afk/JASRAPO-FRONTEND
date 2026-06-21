export type TaskRouteType = 'TOMA_LECTURA' | 'RECONEXION' | 'INSTALACION' | 'INSPECCION';
export type TaskState = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';

export interface TaskMedidor {
  medidorId: string;
  serie: string;
  latitud?: number;
  longitud?: number;
}

export interface TaskOperario {
  usuarioId: number;
  nombres: string;
  apellidos: string;
}

export interface TaskResponse {
  rutaId: string;
  tipoRuta: TaskRouteType;
  nombre: string;
  descripcion?: string;
  estado: TaskState;
  orden: number;
  observacion?: string;
  fechaLimite?: string;
  operarioId: number;
  comunidadId: number;
  sectorId?: number;
  fechaPlanificada?: string;
  fechaInicio?: string;
  fechaFin?: string;
  medidor: TaskMedidor | null;
  operario: TaskOperario;
  rutaPuntos?: TaskRutaPunto[];
}

export interface TaskRutaPunto {
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
  lecturaId: string;
  medidorId: string | null;
  medidorSerie: string;
  fecha: string;
  estado: string;
  anomalias: AnomaliaItem[];
}
