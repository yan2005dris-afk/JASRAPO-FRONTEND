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
  estado: MeterStatusCode;
  motivo?: string;
}

export interface IMeterDto extends Omit<IMeter, 'estado'> {
  estado?: string | IMeterStatus;
}

export interface IUpdateMeterStatusBody {
  estado: MeterStatusCode;
  motivo?: string;
}

export interface IMeterKpis {
  enBodega: number;
  instalados: number;
  danados: number;
  total: number;
}

/**
 * Filtros aceptados por los endpoints de exportación (`/meters/export/pdf` y
 * `/meters/export/csv`). El backend valida con `forbidNonWhitelisted`, por lo
 * que enviar cualquier otro parámetro (page, limit, marca...) responde 400.
 */
export interface IExportMetersParams {
  estado?: MeterStatusCode;
  search?: string;
}

export interface ISearchMetersParams extends IExportMetersParams {
  page?: number;
  limit?: number;
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
