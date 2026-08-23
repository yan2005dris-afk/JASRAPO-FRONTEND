// Resumen de un convenio (lo que devuelve GET /agreements en el listado paginado).
export interface IAgreementSummary {
  convenioId: string;
  contratoId: string;
  numeroCuotas: number;
  abonoInicial: number;
  deudaTotal: number;
  estado: { codigo: string; nombre: string } | string;
  fechaPrimerPago: string;
  montoPagadoActual: number;
  motivo: string | null;
  // Datos del contrato/cliente asociado (vienen por JOIN cuando se usa search).
  numeroGuia?: string;
  clienteNombre?: string;
  clienteIdentificacion?: string;
  clienteEmail?: string | null;
}

// Parámetros del listado de convenios.
export interface ISearchAgreementsParams {
  search?: string;
  page?: number;
  limit?: number;
  contratoId?: string;
}
