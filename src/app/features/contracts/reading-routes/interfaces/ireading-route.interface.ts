export type TipoRuta =
  | 'TOMA_LECTURA'
  | 'RECONEXION'
  | 'INSTALACION'
  | 'INSPECCION';

export interface IReadingForRoute {
  lecturaId: string | number;
  guia: string;
  clienteNombre: string;
  direccion: string;
  sector?: string;
  estadoContrato: string;
}

export interface IReadingRoute {
  rutaId: string | number;
  nombre: string;
  descripcion?: string | null;
  operarioId: number;
  tipoRuta: TipoRuta | string;
  comunidadId: number;
  sectorId?: number | null;
  periodoId: number | null;
  estado: string;
  fechaPlanificada?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

export interface ICreateRouteDto {
  nombre: string;
  descripcion?: string;
  operarioId: number;
  tipoRuta: TipoRuta | string;
  medidorId?: number;
  comunidadId: number;
  sectorId?: number;
  periodoId: number;
  fechaPlanificada?: string;
}

export interface IUpdateRouteDto {
  nombre?: string;
  descripcion?: string;
  operarioId?: number;
  tipoRuta?: TipoRuta | string;
  medidorId?: number;
  comunidadId?: number;
  sectorId?: number;
  periodoId?: number;
  estado?: string;
  fechaPlanificada?: string;
}

export interface IReassignRouteDto {
  operarioId: number;
}

export interface IFindAllRoutesParams {
  page?: number;
  limit?: number;
  estado?: string;
  operarioId?: number;
  comunidadId?: number;
  periodoId?: number;
}

export interface IFilterReadingsParams {
  page?: number;
  limit?: number;
  comunidadId?: number;
  sectorId?: number;
  periodoId?: number;
}
