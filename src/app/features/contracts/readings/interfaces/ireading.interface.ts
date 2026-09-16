export interface IReadingContract {
  contratoId: string;
  numeroGuia: string;
  direccionSuministro: string;
  estado: string;
  sector?: {
    nombre: string;
  } | null;
  cliente?: {
    clienteId: string | number;
    nombres: string;
    apellidos: string;
    razonSocial?: string | null;
    identificacion: string;
  } | null;
}

export interface IReadingMeter {
  medidorId: string;
  serie: string;
  marca: string;
  modelo: string;
}

export interface IReadingPeriod {
  periodoId: number;
  nombre: string;
  fechaInicio: string | Date;
  fechaFin: string | Date;
}

export interface IReading {
  lecturaId: string;
  fecha: string | Date;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoCalculado: number;
  contratoId: string;
  descripcionAnomalia?: string | null;
  fechaValidacion?: string | Date | null;
  isValidada: boolean;
  lecturaInicial: boolean;
  periodoId: number;
  tieneAnomalia: boolean;
  estado: string;
  contrato?: IReadingContract | null;
  medidor?: IReadingMeter | null;
  periodoRel?: IReadingPeriod | null;
}

export interface IUpdateReadingDto {
  fecha?: string;
  lecturaAnterior?: number;
  lecturaActual?: number;
  consumoCalculado?: number;
  descripcionAnomalia?: string;
  isValidada?: boolean;
  lecturaInicial?: boolean;
  periodoId?: number;
  estado?: string;
}

export interface IReadingFilterParams {
  page?: number;
  limit?: number;
  contratoId?: string;
  estado?: string;
  search?: string;
}

export interface IReadingStateCatalog {
  codigo: string;
  nombre: string;
  icono?: string;
}
