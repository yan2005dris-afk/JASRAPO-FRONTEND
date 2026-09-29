// Estado del servicio (el valor real lo define el backend).
export type EstadoServicio = string;

export const COLLECTION_STATUS = {
  NO_APLICA: 'NO_APLICA',
  AL_DIA: 'AL_DIA',
  EN_MORA: 'EN_MORA',
} as const;

export type EstadoCobranza = (typeof COLLECTION_STATUS)[keyof typeof COLLECTION_STATUS];

// Item del catálogo de estados de contrato (GET /contracts/states).
export interface IContractState {
  codigo: string; // código del estado (ej. ACTIVO)
  nombre: string; // etiqueta a mostrar (ej. Activo)
  orden: number; // orden de visualización
}

export interface IContractProcedureData {
  tramitadorEsTitular?: boolean | null;
  tramitadorNombre?: string | null;
  tramitadorIdentificacion?: string | null;
  relacionTramitador?: string | null;
  observacionesTramite?: string | null;
  otrasNovedades?: string | null;
}

// Datos para actualizar un contrato (PATCH /contracts/{id}). Todos opcionales.
// Los medidores se gestionan exclusivamente mediante el flujo de reemplazo (POST /meters/replace).
export interface IUpdateContractRequest extends IContractProcedureData {
  estadoServicio?: EstadoServicio;
  estadoCobranza?: EstadoCobranza;
  direccionSuministro?: string;
  sectorId?: string;
  clienteId?: string;
  comunidadId?: string;
  categoriaTarifaId?: string;
  latitud?: number | null;
  longitud?: number | null;
}

// Categoría tarifaria anidada en el contrato (viene por JOIN)
export interface ICategoriaTarifa {
  categoriaTarifaId: number;
  nombre: string;
  descripcion: string;
  valorBase: number;
  consumoMinimoMensual: number;
  valorExcedenteM3: number;
}

// Cliente resumido que viaja dentro del contrato (viene por JOIN)
export interface IContractCliente {
  clienteId: string;
  identificacion: string;
  nombres: string;
  apellidos: string;
  razonSocial: string | null;
  email: string | null;
  telefono: string | null;
  direccionDomicilio: string | null;
}

// Comunidad anidada
export interface IComunidad {
  comunidadId: number;
  codigo: string;
  nombre: string;
}

// Sector anidado (puede venir null)
export interface ISector {
  sectorId: number;
  codigo: string;
  nombre: string;
}

// Medidor resumido dentro del historial
export interface IMedidorResumen {
  medidorId: string;
  serie: string;
  marca: string;
  modelo: string;
}

export interface IApprovedReading {
  lecturaId: string;
  fecha: string;
  lecturaActual: number;
  lecturaAnterior?: number;
}

// Historial de medidores: el medidor actual es el que tiene fechaHasta === null
export interface IHistorialMedidor {
  historialId: string;
  medidorId: string;
  fechaDesde: string;
  fechaHasta: string | null;
  lecturaInicial?: number;
  lecturaFinal?: number | null;
  ultimaLecturaAprobada?: IApprovedReading | null;
  medidor: IMedidorResumen;
}

// Contrato completo (lo que devuelve GET /contracts)
export interface IContract extends IContractProcedureData {
  registradoPorId?: number | null;
  contratoId: string;
  clienteId: string;
  sectorId: number | null;
  categoriaTarifaId: number;
  numeroGuia: string;
  fechaInicio: string;
  direccionSuministro: string;
  estadoServicio?: EstadoServicio;
  /** Collection state, independent from the service lifecycle. */
  estadoCobranza?: EstadoCobranza;
  /** Whether the contract currently has an active payment agreement. */
  tieneConvenioActivo?: boolean;
  comunidadId: number;

  // Relaciones anidadas (vienen por JOIN/include)
  categoriaTarifa: ICategoriaTarifa;
  cliente: IContractCliente;
  comunidad: IComunidad;
  sector: ISector | null;
  historialMedidores: IHistorialMedidor[];
  latitud?: number | null;
  longitud?: number | null;
}

// Parámetros de filtro del listado de contratos
export interface ISearchContractsParams {
  page?: number;
  limit?: number;
  contratoId?: string;
  medidorId?: string;
  // Búsqueda libre sobre los campos visibles y relacionados del contrato.
  search?: string;
  // Filtros de texto específicos, conservados para consumidores de la API.
  numeroGuia?: string;
  medidorSerie?: string;
  ubicacion?: string;
  estadoServicio?: EstadoServicio;
  estadoCobranza?: EstadoCobranza;
  hasDebt?: boolean;
}

// Datos para registrar un contrato (según el POST /contracts actualizado).
// Obligatorios: clienteId, medidorId, categoriaTarifaId, numeroGuia, direccionSuministro, comunidadId.
// El contratoId (PK) y la fechaInicio los genera el backend automáticamente.
export interface ICreateContractRequest extends IContractProcedureData {
  clienteId: string;
  categoriaTarifaId: string;
  medidorId: string;
  numeroGuia: string;
  direccionSuministro: string;
  comunidadId: string;
  sectorId?: string;
  lecturaInicial?: number;
  estadoServicio?: EstadoServicio;
  creadoPor?: string;
  latitud?: number;
  longitud?: number;
}

/** Returns the service lifecycle state used by contract consumers. */
export function getContractServiceState(contract: Pick<IContract, 'estadoServicio'>): string {
  return contract.estadoServicio ?? '—';
}

/** Returns the collection state without mixing it with service lifecycle. */
export function getContractCollectionState(
  contract: Pick<IContract, 'estadoCobranza'>,
): EstadoCobranza | undefined {
  return contract.estadoCobranza;
}

/** Returns whether the contract has an active payment agreement. */
export function hasActivePaymentAgreement(
  contract: Pick<IContract, 'tieneConvenioActivo'>,
): boolean {
  return contract.tieneConvenioActivo === true;
}
