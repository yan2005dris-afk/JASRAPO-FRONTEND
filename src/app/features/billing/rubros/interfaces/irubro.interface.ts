export type TipoRubro = 'FIJO' | 'VARIABLE' | 'MULTA' | 'OTRO' | 'BIEN' | 'SERVICIO';

export interface ITarifaImpuesto {
  id: number;
  impuestoId: number;
  codigoPorcentaje: string;
  descripcion: string;
  porcentaje: number;
  activo: boolean;
}

export interface IRubro {
  rubroId: number;
  codigoSri?: string | null;
  nombre: string;
  descripcion: string;
  precioUnitario: number;
  tipoRubro: TipoRubro;
  tarifaImpuestoId: number;
  tarifaImpuesto?: {
    id: number;
    codigoPorcentaje: string;
    porcentaje: number;
    descripcion: string;
  };
  activo: boolean;
  esAutomatico: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface ICreateRubroDto {
  codigoSri?: string | null;
  nombre: string;
  descripcion: string;
  precioUnitario: number;
  tipoRubro: TipoRubro;
  tarifaImpuestoId: number;
  activo?: boolean;
  esAutomatico?: boolean;
}

export interface IUpdateRubroDto {
  codigoSri?: string | null;
  nombre?: string;
  descripcion?: string;
  precioUnitario?: number;
  tipoRubro?: TipoRubro;
  tarifaImpuestoId?: number;
  activo?: boolean;
  esAutomatico?: boolean;
}

export interface IRubroFilterParams {
  page?: number;
  limit?: number;
  nombre?: string;
  tipoRubro?: TipoRubro | string;
  tarifaImpuestoId?: number;
  activo?: boolean;
  esAutomatico?: boolean;
}
