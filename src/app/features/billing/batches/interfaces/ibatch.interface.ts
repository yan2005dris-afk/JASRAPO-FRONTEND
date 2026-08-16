import { IPreInvoice } from '../../pre-invoices/interfaces/ipre-invoice.interface';

export interface IBatchCommunity {
  comunidadId: number;
  nombre: string;
}

export interface IBatchPeriod {
  periodoId: number;
  nombre: string;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
}

export interface IBatch {
  loteId: number;
  comunidadId: number;
  periodoId: number;
  estado: string;
  totalMonto: number;
  notas?: string | null;
  creadoPor?: string | null;
  totalEmisiones: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  comunidad?: IBatchCommunity | null;
  periodoRel?: IBatchPeriod | null;
  prefacturas?: IPreInvoice[];
}

export interface IGenerateBatchDto {
  periodoId: number;
  comunidadId?: number;
  creadoPor?: string;
}

export interface IGenerateBatchResponse {
  message: string;
  batchId?: number | null;
}

export interface IBatchStateOption {
  codigo: string;
  descripcion: string;
}
