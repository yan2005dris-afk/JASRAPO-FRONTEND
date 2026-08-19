export interface ICashMovement {
  id: string;
  tipoMovimiento: 'EGRESO' | 'INGRESO_EXTRA';
  monto: number;
  motivo: string;
  comprobanteRef?: string;
  creadoPor: string;
  createdAt: string;
}

export interface ICashPaymentSummary {
  pagoId: string;
  clienteNombre: string;
  clienteIdentificacion?: string;
  montoTotalRecibido: number;
  fechaPago: string;
  metodo: string;
  numeroOperacion?: string;
  referenciaBanco?: string;
}

export interface ICashSessionSummary {
  totalRecaudado: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalTarjeta: number;
  totalEgresos: number;
  totalIngresosExtra: number;
  efectivoEsperado: number;
  cantidadPagos: number;
  cantidadMovimientos: number;
}

export interface ICashSession {
  cajaId: string;
  creadoPor: string;
  fechaApertura: string;
  estado: 'ABIERTA' | 'CERRADA' | 'DESCUADRADA';
  montoApertura: number;
  resumen: ICashSessionSummary;
  movimientos: ICashMovement[];
  pagos: ICashPaymentSummary[];
}

export interface IOpenCashSessionDto {
  montoApertura: number;
}

export interface ICreateCashMovementDto {
  tipoMovimiento: 'EGRESO' | 'INGRESO_EXTRA';
  monto: number;
  motivo: string;
  comprobanteRef?: string;
}

export interface IArqueoItem {
  denominacion: number;
  cantidad: number;
  subtotal?: number;
  esMoneda?: boolean;
}

export interface ICloseCashSessionDto {
  totalTransferenciasDeclaradas?: number;
  novedadCierre?: string;
  arqueo: IArqueoItem[];
}
