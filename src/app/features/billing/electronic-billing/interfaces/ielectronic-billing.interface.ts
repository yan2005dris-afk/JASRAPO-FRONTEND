export enum EstadoComprobante {
  PENDIENTE = 'PENDIENTE',
  RECIBIDA = 'RECIBIDA',
  DEVUELTA = 'DEVUELTA',
  AUTORIZADO = 'AUTORIZADO',
  NO_AUTORIZADO = 'NO_AUTORIZADO',
  EN_PROCESO = 'EN_PROCESO',
  RECHAZADO = 'RECHAZADO',
  ANULADO = 'ANULADO',
  POR_EMITIR = 'POR_EMITIR',
  BORRADOR = 'BORRADOR',
}

export enum TipoComprobante {
  FACTURA = '01',
  NOTA_CREDITO = '04',
  NOTA_DEBITO = '05',
  GUIA_REMISION = '06',
  RETENCION = '07',
}

export interface IComprobanteDetalle {
  id?: string;
  codigoPrincipal?: string;
  descripcion?: string;
  cantidad?: number;
  precioUnitario?: number;
  descuento?: number;
  subtotal?: number;
}

export interface IComprobanteInfoAdicional {
  nombre: string;
  valor: string;
}

export interface IComprobante {
  id: string;
  claveAcceso: string;
  tipoComprobante: string;
  tipoComprobanteDescripcion: string;
  ambiente: string;
  fechaEmision: string;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  rucEmisor: string;
  razonSocialEmisor: string;
  identificacionComprador: string;
  razonSocialComprador: string;
  subtotal: number;
  totalImpuestos: number;
  total: number;
  estado: EstadoComprobante | string;
  fechaAutorizacion?: string;
  numAutorizacion?: string;
  createdAt: string;
  updatedAt: string;
  detalles?: IComprobanteDetalle[];
  infoAdicional?: IComprobanteInfoAdicional[];
  xmlDisponible?: boolean;
}

export interface IQueryComprobantesParams {
  rucEmisor?: string;
  identificacionComprador?: string;
  tipoComprobante?: TipoComprobante | string;
  estado?: EstadoComprobante | string;
  fechaDesde?: string;
  fechaHasta?: string;
  establecimiento?: string;
  puntoEmision?: string;
  page?: number;
  limit?: number;
}

export interface IPaginatedComprobantes {
  data: IComprobante[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
