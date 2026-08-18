export type PreInvoiceState =
  | 'GENERADA'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ANULADA'
  | 'PAGADA';

export type PreInvoiceStateAction =
  | 'APROBADA'
  | 'RECHAZADA'
  | 'EN_REVISION'
  | 'ANULADA';

export interface IPreInvoiceStateOption {
  codigo: string;
  descripcion: string;
  orden?: number;
}

export interface IPreInvoiceDetail {
  prefacturaDetalleId: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  iva: number;
  total: number;
  codigoImpuestoSri?: string | null;
  descuento?: number;
}

export interface IPreInvoice {
  prefacturaId: number;
  uuid: string;
  contratoId: number;
  loteId?: number | null;
  periodoId: number;
  subtotal: number;
  iva: number;
  descuentoTotal: number;
  totalPagar: number;
  deudaAnterior?: number;
  saldoVencido?: number;
  abono?: number;
  saldoActual?: number;
  estado: PreInvoiceState | string;
  clienteNombre?: string | null;
  clienteIdentificacion?: string | null;
  clienteDireccion?: string | null;
  clienteEmail?: string | null;
  tarifaNombre?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  detalles?: IPreInvoiceDetail[];
}

export interface IFindAllPreInvoicesParams {
  page?: number;
  limit?: number;
  loteId?: number;
  periodoId?: number;
  estado?: string;
  contratoId?: string;
  identificacion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface IUpdatePreInvoiceStateDto {
  action: PreInvoiceStateAction;
  motivoRechazo?: string;
}

export interface ISendPreInvoiceEmailResponse {
  message?: string;
  jobId?: string;
  queued?: boolean;
}
