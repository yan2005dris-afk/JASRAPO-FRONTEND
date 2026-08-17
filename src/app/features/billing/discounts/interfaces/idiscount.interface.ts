export type TipoDescuento =
  | 'TERCERA_EDAD'
  | 'DISCAPACIDAD'
  | 'INTERES_MORA'
  | 'EXENCION_TASA'
  | 'CONVENIO'
  | 'OTROS';

export interface IDiscount {
  id: number;
  nombre: string;
  descripcion?: string | null;
  tipoDescuento: TipoDescuento | string;
  valor: number;
  esPorcentaje: boolean;
  rubroId?: number | null;
  rubro?: { rubroId: number; nombre: string; tipoRubro: string; precioUnitario: any } | null;
  activo: boolean;
  aplicaAutomatico: boolean;
}

export interface ICreateDiscountDto {
  nombre: string;
  descripcion?: string;
  tipoDescuento: TipoDescuento | string;
  valor: number;
  esPorcentaje: boolean;
  rubroId?: number;
  aplicaAutomatico?: boolean;
}

export interface IUpdateDiscountDto {
  nombre?: string;
  descripcion?: string;
  tipoDescuento?: TipoDescuento | string;
  valor?: number;
  esPorcentaje?: boolean;
  rubroId?: number;
  activo?: boolean;
  aplicaAutomatico?: boolean;
}

export interface IDiscountFilterParams {
  page?: number;
  limit?: number;
  nombre?: string;
  tipoDescuento?: string;
  activo?: boolean;
  aplicaAutomatico?: boolean;
}

export interface IApplyDiscountToPreinvoiceDto {
  catalogoDescuentoId: number;
  motivo?: string;
  autorizadoPor?: string;
  montoCustom?: number;
}
