export type TipoRubro = 'FIJO' | 'VARIABLE' | 'MULTA' | 'OTRO' | 'BIEN' | 'SERVICIO';

export interface ICodigoSriInfo {
  codigo: string;
  nombreSugerido: string;
  descripcionSugerida: string;
  tipoRubroSugerido: TipoRubro;
  label: string;
}

export const CATALOGO_CODIGOS_SRI: readonly ICodigoSriInfo[] = [
  {
    codigo: '001',
    nombreSugerido: 'Cargo Fijo',
    descripcionSugerida: 'Cargo fijo mensual básico por disponibilidad del servicio de agua',
    tipoRubroSugerido: 'FIJO',
    label: '001 - Cargo Fijo / Conexión Base',
  },
  {
    codigo: '002',
    nombreSugerido: 'Consumo de Agua Potable',
    descripcionSugerida: 'Consumo de agua potable por metro cúbico (m³)',
    tipoRubroSugerido: 'VARIABLE',
    label: '002 - Consumo de Agua Potable (m³)',
  },
  {
    codigo: '003',
    nombreSugerido: 'Interés por Mora',
    descripcionSugerida: 'Recargo por mora en pago extemporáneo de planillas',
    tipoRubroSugerido: 'MULTA',
    label: '003 - Interés por Mora',
  },
  {
    codigo: '004',
    nombreSugerido: 'Tasa de Seguridad',
    descripcionSugerida: 'Tasa comunitaria de seguridad y vigilancia',
    tipoRubroSugerido: 'FIJO',
    label: '004 - Tasa de Seguridad / Mantenimiento',
  },
  {
    codigo: '005',
    nombreSugerido: 'Instalación de Medidor',
    descripcionSugerida: 'Servicio de acometida e instalación de nuevo medidor',
    tipoRubroSugerido: 'SERVICIO',
    label: '005 - Instalación / Acometida de Medidor',
  },
  {
    codigo: '006',
    nombreSugerido: 'Reconexión de Servicio',
    descripcionSugerida: 'Tasa por reconexión tras corte o suspensión del suministro',
    tipoRubroSugerido: 'SERVICIO',
    label: '006 - Reconexión de Servicio',
  },
  {
    codigo: '007',
    nombreSugerido: 'Multa por Infracción',
    descripcionSugerida: 'Sanción económica por adulteración, rotura o bypass',
    tipoRubroSugerido: 'MULTA',
    label: '007 - Multa por Infracción / Manipulación',
  },
  {
    codigo: '099',
    nombreSugerido: 'Otros Servicios / Materiales',
    descripcionSugerida: 'Conceptos varios, accesorios o materiales de plomería',
    tipoRubroSugerido: 'OTRO',
    label: '099 - Otros Servicios / Bienes Adicionales',
  },
] as const;

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
  categoriaTarifaId?: number | null;
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
  categoriaTarifaId?: number | null;
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
  categoriaTarifaId?: number | null;
  activo?: boolean;
  esAutomatico?: boolean;
}

export interface IRubroFilterParams {
  page?: number;
  limit?: number;
  nombre?: string;
  tipoRubro?: TipoRubro | string;
  tarifaImpuestoId?: number;
  categoriaTarifaId?: number;
  activo?: boolean;
  esAutomatico?: boolean;
}
