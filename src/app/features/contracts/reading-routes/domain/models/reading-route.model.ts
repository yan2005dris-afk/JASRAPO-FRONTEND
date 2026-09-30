export type TipoRuta =
  'LECTURA' | 'CORTE' | 'RECONEXION' | 'INSTALACION' | 'INSPECCION';

export interface ITipoActividad {
  tipoActividadId: number;
  codigo: TipoRuta | string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

export interface IReadingForRoute {
  lecturaId: string | number;
  guia: string;
  clienteNombre: string;
  direccion: string;
  sector?: string;
  estadoContrato: string;
  medidorSerie?: string;
  lecturaAnterior?: number;
  lecturaActual?: number;
  consumoCalculado?: number;
  estadoLectura?: string;
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
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'PARCIAL' | 'CANCELADA' | string;
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

export interface ICreateRouteAssignmentsDto {
  periodoId: number;
  operarioId: number;
  comunidadId: number;
  tipoRuta?: TipoRuta | string;
  sectorIds?: number[];
  contratoIds?: number[];
  fechaPlanificada?: string;
  nombreBase?: string;
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
  tipoRuta?: TipoRuta | string;
}

export interface IFilterReadingsParams {
  page?: number;
  limit?: number;
  comunidadId?: number;
  sectorId?: number;
  periodoId?: number;
  fechaPlanificada?: string;
  tipoRuta?: TipoRuta | string;
  search?: string;
}

// --- Ordenes de Trabajo ---
export type TipoActividad = 'INSTALACION' | 'LECTURA' | 'RECONEXION' | 'INSPECCION';
export type EstadoOrden = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA' | 'FALLIDA';

export interface OrderWork {
  ordenTrabajoId: string;
  rutaId: string;
  tipoActividad: TipoActividad;
  estado: EstadoOrden;
  ordenVisita: number;
  resultadoObservacion?: string;
  evidenciaFotoUrl?: string;
  completadoEn?: string;
  lecturaId?: string;
  contrato: {
    numeroContrato: string;
    clienteNombre: string;
    direccion: string;
  };
  medidor?: { numeroSerie: string } | null;
}

export interface IOrdenPaginationMeta {
  totalItems?: number;
  itemCount?: number;
  itemsPerPage?: number;
  totalPages?: number;
  currentPage?: number;
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Conteos agregados sobre el set completo filtrado (no solo la página
 * actual). El backend devuelve estos campos con nombres distintos en los
 * endpoints de lecturas (`aprobadas`, `rechazadas`) y de órdenes
 * (`completadas`, `canceladas`), pero acá los unificamos para que el
 * component los consuma igual. El mapeo vive en `loadReadings()`.
 */
export interface IRouteKpis {
  total: number;
  completadas: number;
  pendientes: number;
  conNovedad: number;
  canceladas: number;
}

/**
 * Shape REAL del backend para los kpis de lecturas (antes de unificar).
 * La diferencia con `IRouteKpis` es semántica:
 *   - lecturas usan `aprobadas` y `rechazadas`
 *   - órdenes usan `completadas` y `canceladas`
 */
export interface ILecturaKpis {
  total: number;
  aprobadas: number;
  pendientes: number;
  conNovedad: number;
  rechazadas: number;
}

export interface PaginatedOrdenResponse {
  data: OrderWork[];
  meta?: IOrdenPaginationMeta;
  kpis?: IRouteKpis;
}

export interface IFilterOrdenParams {
  estado?: string;
  page?: number;
  limit?: number;
}
