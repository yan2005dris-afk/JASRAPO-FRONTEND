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

export interface ISearchMetersParams {
  page?: number;
  limit?: number;
  estado?: MeterStatusCode;
  search?: string;
}

export interface IPaginatedMetersMeta {
  total: number;
  page?: number;
  limit?: number;
  ultimaPagina?: number;
  paginaActual?: number;
  porPagina?: number;
  anterior?: number | null;
  siguiente?: number | null;
}

export interface IPaginatedMetersResponse {
  data?: IMeterDto[];
  meta?: IPaginatedMetersMeta;
  datos?: IMeter[];
  paginacion?: {
    total: number;
    paginaActual: number;
    porPagina: number;
    ultimaPagina: number;
    anterior: number | null;
    siguiente: number | null;
  };
  kpis: IMeterKpis;
}

export type MotivoReemplazoMedidor =
  'DANO' | 'MANTENIMIENTO_PREVENTIVO' | 'CALIBRACION' | 'REUBICACION' | 'FIN_VIDA_UTIL' | 'OTRO';

export type ResponsabilidadDano = 'USUARIO' | 'JUNTA' | 'TERCERO' | 'NO_DETERMINADA' | 'NO_APLICA';

export type TratamientoSaliente =
  'COBRO_REAL' | 'PROMEDIO_HISTORICO' | 'EXONERADO' | 'COBRO_PARCIAL';

export type TratamientoEntrante = 'FACTURAR_PERIODO_ACTUAL' | 'DIFERIR_SIGUIENTE_PERIODO';

export interface IReplaceMeterRequest {
  contratoId: string;
  nuevoMedidorId: string;
  lecturaFinalSaliente: number;
  lecturaInicialEntrante?: number;
  motivo: MotivoReemplazoMedidor;
  responsabilidadDano?: ResponsabilidadDano;
  detalleMotivo?: string;
  tratamientoSaliente: TratamientoSaliente;
  tratamientoEntrante: TratamientoEntrante;
  porcentajeCobro?: number;
  ventanaPromedio?: number;
  periodoOrigenId: number;
  periodoDestinoId?: number;
  ordenTrabajoId?: string;
  fechaReemplazo?: string;
}

export interface IReplaceMeterResponse {
  reemplazoId: string;
  contratoId: string;
  historialSalienteId: string;
  historialEntranteId: string;
  lecturaFinalSalienteId?: string | null;
  lecturaInicialEntranteId?: string | null;
  ordenTrabajoId?: string | null;
  periodoOrigenId: number;
  periodoDestinoId?: number | null;
  motivo: MotivoReemplazoMedidor;
  responsabilidadDano: ResponsabilidadDano;
  detalleMotivo?: string | null;
  tratamientoSaliente: TratamientoSaliente;
  tratamientoEntrante: TratamientoEntrante;
  consumoMedidoSaliente: number;
  consumoFacturableSaliente: number;
  consumoMedidoEntrante: number;
  consumoFacturableEntrante: number;
  consumoDiferidoEntrante: number;
  ventanaPromedio?: number | null;
  promedioCalculado?: number | null;
  porcentajeCobro?: number | null;
  estado: string;
  solicitadoPorUsuarioId?: string | null;
  autorizadoPorUsuarioId?: string | null;
  autorizadoEn?: string | null;
  createdAt: string;
}
