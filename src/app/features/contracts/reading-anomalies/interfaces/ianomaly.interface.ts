export type TipoAnomalia = 'FUGA' | 'MEDIDOR_DAÑADO' | 'LECTURA_ERRONEA' | 'OTRO';

export type EstadoNovedad = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
export type EstadoAnomalia =
  'PENDIENTE' | 'EN_REVISION' | 'RESUELTA' | 'DESCARTADA' | EstadoNovedad;

export interface IReadingAnomalyReading {
  lecturaId: string;
  fecha: string | Date;
  lecturaActual: number;
  consumoCalculado: number;
}

export interface IReadingAnomaly {
  anomaliaId: string;
  novedadId?: string;
  ordenTrabajoId?: string;
  lecturaId?: string | null;
  observacion?: string | null;
  tipo: TipoAnomalia | string;
  estado: EstadoAnomalia | string;
  resolucionTipo?: string | null;
  consumoAjustado?: number | null;
  observacionResolucion?: string | null;
  fotoUrl?: string | null;
  lectura?: IReadingAnomalyReading | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ICreateReadingAnomalyDto {
  ordenTrabajoId?: string | number;
  lecturaId?: string | number;
  tipo: TipoAnomalia | string;
  estado?: EstadoAnomalia | string;
  observacion?: string;
  fotoUrl?: string;
}

export interface IUpdateReadingAnomalyDto {
  tipo?: TipoAnomalia | string;
  observacion?: string;
  estado?: EstadoAnomalia | string;
  resolucionTipo?: string;
  consumoAjustado?: number;
  observacionResolucion?: string;
  fotoUrl?: string;
}

export interface IReadingAnomalyFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  ordenTrabajoId?: string;
  lecturaId?: string;
  tipo?: string;
  estado?: string;
}

export interface IWorkOrderNoveltyRaw {
  novedadId?: string | number;
  anomaliaId?: string | number;
  ordenTrabajoId?: string | number;
  lecturaId?: string | number | null;
  observacion?: string | null;
  tipo: TipoAnomalia | string;
  estado: EstadoAnomalia | string;
  resolucionTipo?: string | null;
  consumoAjustado?: number | null;
  observacionResolucion?: string | null;
  fotoUrl?: string | null;
  lectura?: IReadingAnomalyReading | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
