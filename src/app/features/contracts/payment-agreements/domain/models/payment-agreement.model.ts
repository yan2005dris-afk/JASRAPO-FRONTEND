export interface IInstallmentState {
  codigo: string;
  nombre: string;
}

export interface IInstallment {
  cuotaConvenioId: string;
  convenioId: string;
  numeroCuota: number;
  valorCuota: number;
  fechaVencimiento: string;
  estado: IInstallmentState;
  fechaPago?: string | null;
  montoPagado: number;
  saldoPendiente: number;
  diasRetraso: number;
  interesMoraAplicado: number;
  pagoCompleto: boolean;
  fechaPagoAnticipado?: string | null;
}

export interface IAgreementState {
  codigo: string;
  nombre: string;
}

export interface IAgreement {
  convenioId: string;
  contratoId: string;
  numeroCuotas: number;
  abonoInicial: number;
  deudaTotal: number;
  mesesMoraActual: number;
  estado: IAgreementState;
  fechaAprobacion?: string | null;
  fechaPrimerPago: string;
  fechaProximoPago?: string | null;
  montoPagadoActual: number;
  motivo?: string | null;
  fechaCreacion: string;
  cuotas?: IInstallment[];
  numeroGuia?: string;
  clienteNombre?: string;
  clienteIdentificacion?: string;
  clienteEmail?: string | null;
}

export interface IPrefacturaDeudaItem {
  prefacturaId: string;
  periodoId: number;
  totalPagar: number;
  abono: number;
  saldoPendiente: number;
  estado: string;
  fechaCreacion?: string | null;
}

export interface IDebtSummary {
  contratoId: string;
  deudaTotal: number;
  deudaAnterior: number;
  tasaMensualVigente: number;
  maxMesesAtrasado: number;
  totalPrefacturasImpagadas: number;
  prefacturas: IPrefacturaDeudaItem[];
}

export interface ICreateAgreementDto {
  contratoId: string;
  numeroCuotas: number;
  abonoInicial?: number;
  fechaPrimerPago: string;
  motivo?: string;
}

export interface IUpdateAgreementDto {
  estado?: string;
  motivo?: string;
}

export interface IFindAllAgreementsParams {
  page?: number;
  limit?: number;
  contratoId?: string;
  estado?: string;
  search?: string;
}

export interface ISimulatedInstallment {
  numeroCuota: number;
  fechaVencimiento: string;
  valorCuota: number;
  saldoRestante: number;
}
