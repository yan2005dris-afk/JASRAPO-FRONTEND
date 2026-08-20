export type TipoRubro = 'FIJO' | 'VARIABLE' | 'MULTA' | 'OTRO' | 'BIEN' | 'SERVICIO';

export interface ICodigoSriInfo {
  codigo: string;
  nombreSugerido: string;
  descripcionSugerida: string;
  tipoRubroSugerido: TipoRubro;
  ivaSugeridoPct: number; // 0 para exento/tarifa 0%, 15 para bienes/servicios gravados
  label: string;
}

export const CATALOGO_CODIGOS_SRI: readonly ICodigoSriInfo[] = [
  {
    codigo: '001',
    nombreSugerido: 'Cargo Fijo',
    descripcionSugerida: 'Cargo fijo mensual por disponibilidad de servicio de agua potable',
    tipoRubroSugerido: 'FIJO',
    ivaSugeridoPct: 0, // Agua potable / saneamiento básico es tarifa 0% IVA
    label: '001 - Cargo Fijo (Agua Potable - IVA 0%)',
  },
  {
    codigo: '002',
    nombreSugerido: 'Consumo de Agua Potable',
    descripcionSugerida: 'Consumo de agua potable por metro cúbico (m³)',
    tipoRubroSugerido: 'VARIABLE',
    ivaSugeridoPct: 0, // Servicio público de agua potable tarifa 0% IVA
    label: '002 - Consumo de Agua Potable (m³ - IVA 0%)',
  },
  {
    codigo: '003',
    nombreSugerido: 'Interés por Mora',
    descripcionSugerida: 'Recargo por mora en pago extemporáneo de planillas',
    tipoRubroSugerido: 'MULTA',
    ivaSugeridoPct: 0, // Intereses y multas no gravan IVA
    label: '003 - Interés por Mora (Multa - IVA 0%)',
  },
  {
    codigo: '004',
    nombreSugerido: 'Tasa de Seguridad y Mantenimiento',
    descripcionSugerida: 'Tasa comunitaria para seguridad y mantenimiento de redes',
    tipoRubroSugerido: 'FIJO',
    ivaSugeridoPct: 0,
    label: '004 - Tasa de Seguridad / Mantenimiento (IVA 0%)',
  },
  {
    codigo: '005',
    nombreSugerido: 'Servicio de Instalación de Medidor',
    descripcionSugerida: 'Mano de obra y servicio técnico de instalación de acometida',
    tipoRubroSugerido: 'SERVICIO',
    ivaSugeridoPct: 15, // Servicios técnicos gravan IVA 15%
    label: '005 - Servicio de Instalación de Medidor (Servicio - IVA 15%)',
  },
  {
    codigo: '006',
    nombreSugerido: 'Servicio de Reconexión',
    descripcionSugerida: 'Servicio de reconexión tras corte o suspensión de suministro',
    tipoRubroSugerido: 'SERVICIO',
    ivaSugeridoPct: 15, // Servicio técnico grava IVA 15%
    label: '006 - Servicio de Reconexión (Servicio - IVA 15%)',
  },
  {
    codigo: '007',
    nombreSugerido: 'Multa por Infracción o Bypass',
    descripcionSugerida: 'Sanción económica por adulteración, daño o bypass no autorizado',
    tipoRubroSugerido: 'MULTA',
    ivaSugeridoPct: 0,
    label: '007 - Multa por Infracción (Multa - IVA 0%)',
  },
  {
    codigo: '008',
    nombreSugerido: 'Venta de Medidor / Materiales de Conexión',
    descripcionSugerida: 'Medidor de agua físico, tuberías, llaves de paso y accesorios',
    tipoRubroSugerido: 'BIEN',
    ivaSugeridoPct: 15, // Venta de bienes/materiales grava IVA 15%
    label: '008 - Medidor / Materiales de Conexión (Bien - IVA 15%)',
  },
  {
    codigo: '009',
    nombreSugerido: 'Venta de Accesorios y Repuestos',
    descripcionSugerida: 'Repuestos, niples, uniones, sellos de seguridad y válvulas',
    tipoRubroSugerido: 'BIEN',
    ivaSugeridoPct: 15, // Venta de bienes físicos grava IVA 15%
    label: '009 - Accesorios y Repuestos (Bien - IVA 15%)',
  },
  {
    codigo: '099',
    nombreSugerido: 'Otros Servicios o Bienes Varios',
    descripcionSugerida: 'Conceptos adicionales no clasificados',
    tipoRubroSugerido: 'OTRO',
    ivaSugeridoPct: 15,
    label: '099 - Otros Servicios / Bienes Varios (IVA 15%)',
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
