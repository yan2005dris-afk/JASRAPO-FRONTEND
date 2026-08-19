/** Filtros para el reporte de abonos (todos opcionales). */
export interface IPaymentsReportFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  clienteId?: string;
}

/** Filtros para el historial de conexión (contrato obligatorio). */
export interface IConnectionHistoryFilters {
  contratoId: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

/** Filtros para el convenio de pago (convenio obligatorio). */
export interface IPaymentAgreementFilters {
  convenioId: string;
}

/** Filtros para el listado de clientes (todos opcionales). */
export interface IClientsListFilters {
  identificacion?: string;
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
  activo?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
}

/** Filtros para el estado de cuenta (contrato obligatorio). */
export interface IAccountStatementFilters {
  contratoId: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

/** Filtros para el reporte de recaudación y morosidad. */
export interface IOverdueAccountsFilters {
  contratoId?: string;
  clienteId?: string;
  sectorId?: string;
  fechaCorte?: string;
}

/** Cuerpo de envío por email de la mayoría de los reportes. */
export interface ISendReportEmailBody {
  clienteId?: string;
  contratoId?: string;
  convenioId?: string;
  destinatario?: string;
  subject?: string;
}

/** Cuerpo de envío por email del listado de clientes (destinatario obligatorio). */
export interface ISendClientsListEmailBody {
  destinatario: string;
  subject?: string;
  filtros?: IClientsListFilters;
}

/** Respuesta JSON genérica de los reportes (la forma exacta la define el backend). */
export type IReportResponse = Record<string, unknown>;
