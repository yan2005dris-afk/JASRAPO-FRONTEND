export interface IMeterStatus {
  codigo: string;
  nombre: string;
  orden: number;
}

export type MeterStatusCode = 'BODEGA' | 'INSTALADO' | 'DANADO' | 'PENDIENTE' | 'BAJA';
export type MeterStatusFilter = 'todos' | MeterStatusCode;

export interface IMeter {
  medidorId: number;
  marca: string;
  modelo: string;
  serie: string;
  estado?: IMeterStatus;
  fechaInstalacion: string | null;
  contratoId: string | null;
  latitud: number | null;
  longitud: number | null;
  motivo?: string;
}

export interface ICreateMeterPayload {
  marca: string;
  modelo: string;
  serie: string;
}

/**
 * Estructura de datos para la transición de estados.
 * Permite actualizar la situación del medidor e incluir un comentario.
 */
export interface IEditMeterStatusPayload {
  medidorId: number;
  estado: string;
  motivo?: string;
}

export interface IMeterDto extends Omit<IMeter, 'estado'> {
  estado?: string | IMeterStatus;
}

export interface IUpdateMeterStatusBody {
  estado: string;
  motivo?: string;
}

export interface IMeterKpis {
  enBodega: number;
  instalados: number;
  danados: number;
  total: number;
}

export interface ISearchMetersParams {
  page?: number;
  limit?: number;
  estado?: string;
  search?: string;
}

export interface IPaginatedMetersMeta {
  total: number;
  page: number;
  limit: number;
  ultimaPagina: number;
  paginaActual: number;
  porPagina: number;
  anterior: number | null;
  siguiente: number | null;
}

export interface IPaginatedMetersResponse {
  data: IMeterDto[];
  meta: IPaginatedMetersMeta;
  kpis: IMeterKpis;
}
