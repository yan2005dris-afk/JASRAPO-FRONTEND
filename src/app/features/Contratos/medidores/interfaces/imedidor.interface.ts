/**
 * Definición de los estados permitidos para un medidor dentro del flujo de inventario.
 * BODEGA: Disponible para instalación.
 * INSTALADO: Vinculado a un contrato activo.
 * DANADO: Reportado con fallas técnicas.
 * BAJA: Fuera de servicio de forma definitiva.
 */
export type EstadoMedidor = 'BODEGA' | 'INSTALADO' | 'DANADO' | 'BAJA';

/**
 * Entidad Principal de Medidor
 * Representa la estructura de datos completa de un equipo de medición en el sistema.
 */
export interface IMedidor {
  medidorId: string;
  marca: string;
  modelo: string;
  serie: string;
  estado: EstadoMedidor;
  fechaInstalacion: string | null; // Fecha en la que se vinculó a un predio
  contratoId: string | null; // Referencia al contrato si está INSTALADO
  latitud: number | null; // Coordenadas geográficas de ubicación
  longitud: number | null; // Coordenadas geográficas de ubicación
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
  medidor: IMedidor;
  estado: EstadoMedidor;
  motivo?: string;
}
