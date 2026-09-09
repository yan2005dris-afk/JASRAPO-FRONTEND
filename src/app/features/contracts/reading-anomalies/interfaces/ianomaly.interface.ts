export type TipoAnomalia = 'FUGA' | 'MEDIDOR_DAÑADO' | 'LECTURA_ERRONEA' | 'OTRO';

export type EstadoAnomalia = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTA' | 'DESCARTADA';

export interface IReadingAnomalyReading {
  lecturaId: string;
  fecha: string | Date;
  lecturaActual: number;
  consumoCalculado: number;
}

export interface IReadingAnomaly {
  anomaliaId: string;
  lecturaId: string;
  observacion?: string | null;
  tipo: TipoAnomalia | string;
  estado: EstadoAnomalia | string;
  fotoUrl?: string | null;
  lectura?: IReadingAnomalyReading | null;
}

export interface ICreateReadingAnomalyDto {
  lecturaId: string | number;
  tipo: TipoAnomalia | string;
  estado: EstadoAnomalia | string;
  observacion?: string;
  fotoUrl?: string;
}

export interface IUpdateReadingAnomalyDto {
  tipo?: TipoAnomalia | string;
  observacion?: string;
  estado?: EstadoAnomalia | string;
  fotoUrl?: string;
}

export interface IReadingAnomalyFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  lecturaId?: string;
  tipo?: string;
  estado?: string;
}
