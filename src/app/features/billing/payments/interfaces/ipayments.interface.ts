export type EstadoPago = 'PENDIENTE' | 'REGISTRADO' | 'ANULADO';

export type TipoDetallePago =
  | 'COMPROBANTE'
  | 'CUOTA_CONVENIO'
  | 'SALDO_FAVOR'
  | 'PAGO_LIBRE'
  | 'OTRO';

export type Banco =
  | 'PICHINCHA'
  | 'GUAYAQUIL'
  | 'PACIFICO'
  | 'PRODUBANCO'
  | 'INTERNACIONAL'
  | 'BOLIVARIANO'
  | 'AUSTRO'
  | 'SOLIDARIO'
  | 'LOJA'
  | 'GENERAL_RODAPAR'
  | 'COOP_MEGO'
  | 'COOP_JEP'
  | 'OTRO';

export type TarjetaCredito =
  | 'VISA'
  | 'MASTERCARD'
  | 'DINERS'
  | 'DISCOVER'
  | 'AMERICAN_EXPRESS'
  | 'ALIA'
  | 'OTRO';

export interface IPaginationMeta {
  totalItems?: number;
  itemCount?: number;
  itemsPerPage?: number;
  totalPages?: number;
  currentPage?: number;
  total?: number;
  page?: number;
  limit?: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta?: IPaginationMeta;
}

export interface IPaymentStateOption {
  codigo: string;
  descripcion: string;
}

export interface IBankOption {
  codigo: string;
  descripcion: string;
}

export interface ICardBrandOption {
  codigo: string;
  descripcion: string;
}

export interface IPaymentDetailComprobante {
  comprobanteId: string;
  tipoComprobante: string;
  secuencial: string;
  importeTotal: number | null;
  estado: string;
}

export interface IPaymentDetail {
  detallePagoId: string;
  pagoId: string;
  comprobanteId: string | null;
  cuotaConvenioId: string | null;
  tipoPago: TipoDetallePago;
  montoAbonado: number;
  formaPagoId: number;
  referencia: string | null;
  fechaTransaccion: string | null;
  fechaCreacion: string;
  comprobante?: IPaymentDetailComprobante;
}

export interface ISaldoFavor {
  saldoFavorId: string;
  clienteId: string;
  origenPagoId: string;
  montoOriginal: number;
  montoDisponible: number;
  estado: string;
  fechaExpiracion: string | null;
  fechaCreacion: string;
}

export interface IPayment {
  pagoId: string;
  clienteId: string;
  clienteNombre?: string;
  clienteIdentificacion?: string;
  cajaId: string | null;
  banco: Banco | string | null;
  tarjetaCredito: TarjetaCredito | string | null;
  comprobanteUrl: string | null;
  fechaPago: string;
  montoTotalRecibido: number;
  numeroOperacion: string | null;
  observaciones: string | null;
  referenciaBanco: string | null;
  estadoPago: EstadoPago;
  creadoPor: string;
  anuladoPor: string | null;
  fechaAnulacion: string | null;
  motivoAnulacion: string | null;
  fechaCreacion: string;
  fechaActualizacion: string | null;
  detallePago?: IPaymentDetail[];
  saldosFavor?: ISaldoFavor[];
}

export interface IDailyCashDetailItem {
  codigo: string;
  total: number;
}

export interface IDailyCashSummary {
  fecha: string;
  cajaId: string | null;
  totalPagos: number;
  totalRecaudado: number;
  desglosePorTipoDetalle: IDailyCashDetailItem[];
  desglosePorTipoComprobante: IDailyCashDetailItem[];
}

export interface IFindAllPaymentsParams {
  page?: number;
  limit?: number;
  clienteId?: string;
  estadoPago?: EstadoPago | string;
  banco?: string;
  tarjetaCredito?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ICreatePaymentDetailDto {
  comprobanteId?: string;
  cuotaConvenioId?: string;
  tipoPago: TipoDetallePago;
  montoAbonado: number;
  formaPagoId: number;
  referencia?: string;
  fechaTransaccion?: string;
}

export interface ICreatePaymentDto {
  clienteId: string;
  cajaId?: string;
  banco?: Banco | string;
  tarjetaCredito?: TarjetaCredito | string;
  fechaPago: string;
  montoTotalRecibido: number;
  numeroOperacion?: string;
  observaciones?: string;
  referenciaBanco?: string;
  comprobanteUrl?: string;
  detalle: ICreatePaymentDetailDto[];
}

export interface IApplySaldoFavorDto {
  saldoFavorId: string;
  clienteId: string;
  montoAplicar: number;
  comprobanteId?: string;
  cuotaConvenioId?: string;
  formaPagoId: number;
  observaciones?: string;
}

export interface IUpdatePaymentStateDto {
  estadoPago: EstadoPago;
  motivoAnulacion?: string;
}

export interface IAnnulPaymentDto {
  motivoAnulacion: string;
}
