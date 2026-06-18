export interface IEstadoMedidor {
  codigo: string;
  nombre: string;
  orden: number;
}

export type EstadoMedidorCodigo = 'BODEGA' | 'INSTALADO' | 'DANADO' | 'PENDIENTE' | 'BAJA';
export type EstadoMedidorFiltro = 'todos' | EstadoMedidorCodigo;

export interface IMeter {
  medidorId: number;
  marca: string;
  modelo: string;
  serie: string;
  estado?: IEstadoMedidor;
  fechaInstalacion: string | null;
  contratoId: string | null;
  latitud: number | null;
  longitud: number | null;
  motivo?: string;
}

export interface CrearMedidorPayload {
  marca: string;
  modelo: string;
  serie: string;
}

/**
 * Estructura de datos para la transición de estados.
 * Permite actualizar la situación del medidor e incluir un comentario.
 */
export interface EditarEstadoMedidorPayload {
  medidorId: number;
  estado: string;
  motivo?: string;
}

export interface IMeterDto extends Omit<IMeter, 'estado'> {
  estado?: string | IEstadoMedidor;
}

export interface ActualizarEstadoMedidorBody {
  estado: string;
  motivo?: string;
}

export interface MeterKpis {
  enBodega: number;
  instalados: number;
  danados: number;
  total: number;
}

export interface SearchMetersParams {
  page?: number;
  limit?: number;
  estado?: string;
  search?: string;
}

export interface PaginatedMetersMeta {
  total: number;
  page: number;
  limit: number;
  ultimaPagina: number;
  paginaActual: number;
  porPagina: number;
  anterior: number | null;
  siguiente: number | null;
}

export interface PaginatedMetersResponse {
  data: IMeterDto[];
  meta: PaginatedMetersMeta;
  kpis: MeterKpis;
}
