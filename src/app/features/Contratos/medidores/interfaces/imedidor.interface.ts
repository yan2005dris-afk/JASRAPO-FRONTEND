export interface IEstadoMedidor {
  estadoId: number;
  codigo: string;
  nombre: string;
  orden: number;
}
/**
 * Entidad Principal de Medidor
 * Representa la estructura de datos completa de un equipo de medición en el sistema.
 */
export interface IMedidor {
  medidorId: number;
  marca: string;
  modelo: string;
  serie: string;
  estado?: IEstadoMedidor;
  fechaInstalacion: string | null;
  contratoId: string | null;
  latitud: number | null;
  longitud: number | null;
  motivo?: string;
}

/**
 * Estructura de datos requerida para el registro inicial de un equipo.
 * Se centra en la identificación física del hardware.
 */
export interface CrearMedidorPayload {
  marca: string;
  modelo: string;
  serie: string;
}

/**
 * Estructura de datos para la transición de estados.
 * Permite actualizar la situación del medidor e incluir un comentario.
 */
export interface EditarEstadoMedidorPayload {
  medidorId: number;
  estadoId: number;
  motivo?: string;
}
