// Estado del contrato (el valor real lo define el backend).
export type EstadoContrato = string;

// Item del catálogo de estados de contrato (GET /contracts/states).
export interface IContractState {
  codigo: string; // código del estado (ej. ACTIVO)
  nombre: string; // etiqueta a mostrar (ej. Activo)
  orden: number; // orden de visualización
}

// Datos para actualizar un contrato (PATCH /contracts/{id}). Todos opcionales.
// Si se envía medidorId, el backend reemplaza el medidor en una transacción.
export interface IUpdateContractRequest {
  estado?: string;
  direccionSuministro?: string;
  sectorId?: string;
  medidorId?: string;
  lecturaInicial?: number;
  // Edición completa: el backend acepta cambiar cliente, comunidad y tarifa.
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
  // Búsqueda libre por número de guía, nombre/razón social o identificación del cliente.
  search?: string;
  // Filtros sobre las columnas visibles de la tabla (búsqueda de texto + estado).
  // El backend los irá soportando; hoy solo numeroGuia está implementado.
  numeroGuia?: string;
  medidorSerie?: string;
  ubicacion?: string;
  estado?: string;
}

// Campos por los que se puede buscar texto en la tabla (debe coincidir con ISearchContractsParams).
export type SearchContractField = 'numeroGuia' | 'medidorSerie' | 'ubicacion';

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
  creadoPor?: string;
}
