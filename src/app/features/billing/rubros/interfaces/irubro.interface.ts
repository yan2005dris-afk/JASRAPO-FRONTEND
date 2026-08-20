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
    ivaSugeridoPct: 0,
    label: '001 - Cargo Fijo (Agua Potable - IVA 0%)',
  },
  {
    codigo: '002',
    nombreSugerido: 'Consumo de Agua Potable',
    descripcionSugerida: 'Consumo de agua potable por metro cúbico (m³)',
    tipoRubroSugerido: 'VARIABLE',
    ivaSugeridoPct: 0,
    label: '002 - Consumo de Agua Potable (m³ - IVA 0%)',
  },
  {
    codigo: 'SERV-INST-01',
    nombreSugerido: 'Instalación y Acometida Tipo 1 (Básica)',
    descripcionSugerida:
      'Mano de obra y servicio técnico de instalación de acometida corta (hasta 10m)',
    tipoRubroSugerido: 'SERVICIO',
    ivaSugeridoPct: 15,
    label: 'SERV-INST-01 - Instalación Acometida Básica (Servicio - IVA 15%)',
  },
  {
    codigo: 'SERV-INST-02',
    nombreSugerido: 'Instalación y Acometida Tipo 2 (Extendida)',
    descripcionSugerida:
      'Mano de obra y servicio técnico de instalación de acometida larga / cruce de vía',
    tipoRubroSugerido: 'SERVICIO',
    ivaSugeridoPct: 15,
    label: 'SERV-INST-02 - Instalación Acometida Extendida (Servicio - IVA 15%)',
  },
  {
    codigo: 'SERV-REC-01',
    nombreSugerido: 'Servicio de Reconexión',
    descripcionSugerida: 'Reconexión del suministro tras corte o suspensión',
    tipoRubroSugerido: 'SERVICIO',
    ivaSugeridoPct: 15,
    label: 'SERV-REC-01 - Reconexión de Suministro (Servicio - IVA 15%)',
  },
  {
    codigo: 'SERV-INSP-01',
    nombreSugerido: 'Servicio de Inspección Técnica',
    descripcionSugerida: 'Inspección de fugas, presión o verificación de acometida',
    tipoRubroSugerido: 'SERVICIO',
    ivaSugeridoPct: 15,
    label: 'SERV-INSP-01 - Inspección Técnica (Servicio - IVA 15%)',
  },
  {
    codigo: 'SERV-GUIA-01',
    nombreSugerido: 'Emisión de Guía de Remisión Tipo 1 (Transporte Local)',
    descripcionSugerida: 'Tasa administrativa por emisión y autorización de guía de remisión local',
    tipoRubroSugerido: 'SERVICIO',
    ivaSugeridoPct: 15,
    label: 'SERV-GUIA-01 - Guía de Remisión Local (Servicio - IVA 15%)',
  },
  {
    codigo: 'SERV-GUIA-02',
    nombreSugerido: 'Emisión de Guía de Remisión Tipo 2 (Interprovincial)',
    descripcionSugerida:
      'Tasa administrativa por emisión de guía de remisión para transporte de materiales',
    tipoRubroSugerido: 'SERVICIO',
    ivaSugeridoPct: 15,
    label: 'SERV-GUIA-02 - Guía de Remisión Interprovincial (Servicio - IVA 15%)',
  },
  {
    codigo: 'BIEN-MED-01',
    nombreSugerido: 'Medidor de Agua Chorro Único 1/2 pulgada',
    descripcionSugerida: 'Medidor volumétrico certificado clase B con acoples',
    tipoRubroSugerido: 'BIEN',
    ivaSugeridoPct: 15,
    label: 'BIEN-MED-01 - Medidor de Agua 1/2 pulgada (Bien - IVA 15%)',
  },
  {
    codigo: 'BIEN-MED-02',
    nombreSugerido: 'Medidor de Agua Chorro Múltiple 3/4 pulgada',
    descripcionSugerida: 'Medidor de alta precisión para acometidas comerciales/industriales',
    tipoRubroSugerido: 'BIEN',
    ivaSugeridoPct: 15,
    label: 'BIEN-MED-02 - Medidor de Agua 3/4 pulgada (Bien - IVA 15%)',
  },
  {
    codigo: 'BIEN-CAJA-01',
    nombreSugerido: 'Caja Protectora de Medidor con Tapa',
    descripcionSugerida: 'Caja plástica de alta resistencia para intemperie',
    tipoRubroSugerido: 'BIEN',
    ivaSugeridoPct: 15,
    label: 'BIEN-CAJA-01 - Caja Protectora de Medidor (Bien - IVA 15%)',
  },
  {
    codigo: 'BIEN-LLAV-01',
    nombreSugerido: 'Válvula de Paso / Llave de Corte Antifraude',
    descripcionSugerida: 'Llave de paso esférica de bronce con candado de seguridad',
    tipoRubroSugerido: 'BIEN',
    ivaSugeridoPct: 15,
    label: 'BIEN-LLAV-01 - Válvula de Corte Antifraude (Bien - IVA 15%)',
  },
  {
    codigo: 'MULT-MORA-01',
    nombreSugerido: 'Interés por Mora',
    descripcionSugerida: 'Recargo legal por mora en planillas vencidas',
    tipoRubroSugerido: 'MULTA',
    ivaSugeridoPct: 0,
    label: 'MULT-MORA-01 - Interés por Mora (Multa - IVA 0%)',
  },
  {
    codigo: 'MULT-BYPASS-01',
    nombreSugerido: 'Multa por Infracción o Conexión Clandestina',
    descripcionSugerida: 'Sanción por bypass, ruptura de sellos o manipulación de medidor',
    tipoRubroSugerido: 'MULTA',
    ivaSugeridoPct: 0,
    label: 'MULT-BYPASS-01 - Multa por Infracción / Bypass (Multa - IVA 0%)',
  },
  {
    codigo: 'TASA-SEG-01',
    nombreSugerido: 'Tasa de Seguridad y Vigilancia de Redes',
    descripcionSugerida: 'Aporte comunitario de seguridad y preservación de fuentes de agua',
    tipoRubroSugerido: 'FIJO',
    ivaSugeridoPct: 0,
    label: 'TASA-SEG-01 - Tasa de Seguridad de Redes (IVA 0%)',
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
