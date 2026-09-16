// Estado del contrato (el valor real lo define el backend).
export type EstadoContrato = string;

const LEGACY_CONVENIO_STATE = 'EN_CONVENIO';

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

// Datos para actualizar un contrato (PATCH /contracts/{id}). Todos opcionales.
// Los medidores se gestionan exclusivamente mediante el flujo de reemplazo (POST /meters/replace).
export interface IUpdateContractRequest {
  estado?: string;
  estadoServicio?: EstadoContrato;
  direccionSuministro?: string;
  sectorId?: string;
  clienteId?: string;
  comunidadId?: string;
  categoriaTarifaId?: string;
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
export interface IContract {
  contratoId: string;
  clienteId: string;
  sectorId: number | null;
  categoriaTarifaId: number;
  numeroGuia: string;
  fechaInicio: string;
  direccionSuministro: string;
  estado: EstadoContrato;
  /** Service lifecycle state. `estado` is retained for older deployments. */
  estadoServicio?: EstadoContrato;
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
  estadoServicio?: EstadoContrato;
  estadoCobranza?: EstadoCobranza;
  estado?: string;
  hasDebt?: boolean;
}

// Datos para registrar un contrato (según el POST /contracts actualizado).
// Obligatorios: clienteId, medidorId, categoriaTarifaId, numeroGuia, direccionSuministro, comunidadId.
// El contratoId (PK) y la fechaInicio los genera el backend automáticamente.
export interface ICreateContractRequest {
  clienteId: string;
  categoriaTarifaId: string;
  medidorId: string;
  numeroGuia: string;
  direccionSuministro: string;
  comunidadId: string;
  sectorId?: string;
  lecturaInicial?: number;
  estado?: string;
  estadoServicio?: EstadoContrato;
  creadoPor?: string;
}

/** Returns the service state while supporting legacy API responses. */
export function getContractServiceState(
  contract: Pick<IContract, 'estado' | 'estadoServicio'>,
): string {
  const state = contract.estadoServicio ?? contract.estado;
  return state === LEGACY_CONVENIO_STATE ? 'ACTIVO' : state;
}

/** Returns collection state without exposing the legacy combined value. */
export function getContractCollectionState(
  contract: Pick<IContract, 'estado' | 'estadoServicio' | 'estadoCobranza'>,
): EstadoCobranza | undefined {
  const state = contract.estadoCobranza as string | undefined;
  if (
    state === COLLECTION_STATUS.NO_APLICA ||
    state === COLLECTION_STATUS.AL_DIA ||
    state === COLLECTION_STATUS.EN_MORA
  ) {
    return state;
  }

  // Older responses used the combined estado field. Pending services never enter collection.
  const legacyServiceState = contract.estadoServicio ?? contract.estado;
  if (legacyServiceState === 'PENDIENTE_PAGO' || legacyServiceState === 'PENDIENTE_INSTALACION') {
    return COLLECTION_STATUS.NO_APLICA;
  }

  if (legacyServiceState === COLLECTION_STATUS.AL_DIA) return COLLECTION_STATUS.AL_DIA;
  if (legacyServiceState === COLLECTION_STATUS.EN_MORA) return COLLECTION_STATUS.EN_MORA;

  // EN_CONVENIO is a legacy agreement state, never a collection state.
  return undefined;
}

/** Uses the derived flag when present and falls back to the legacy state. */
export function hasActivePaymentAgreement(
  contract: Pick<IContract, 'estado' | 'tieneConvenioActivo'>,
): boolean {
  return contract.tieneConvenioActivo ?? contract.estado === LEGACY_CONVENIO_STATE;
}
