/**
 * Colores de marcadores en el mapa según estado de lectura del medidor.
 */
export const MARKER_COLORS: Record<string, string> = {
  __SIN_LECTURA__: '#d1d5db',
  PENDIENTE: '#6b7280',
  POR_REVISION: '#f59e0b',
  RECHAZADA_VERIFICACION: '#ef4444',
  APROBADA: '#22c55e',
  ESTIMADA: '#3b82f6',
  PLANILLADA: '#8b5cf6',
  CON_NOVEDAD: '#f97316',
};

/**
 * Iconos Bootstrap-Icons por tipo de ruta de operador.
 */
export const TIPO_ICONS: Record<string, string> = {
  TOMA_LECTURA: 'bi-droplet-fill',
  INSTALACION: 'bi-tools',
  INSPECCION: 'bi-search',
  RECONEXION: 'bi-plug-fill',
};

/**
 * Etiquetas legibles para cada estado de tarea.
 */
export const STATE_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

/**
 * Opciones de filtro para tipo de ruta.
 */
export const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Lecturas', value: 'TOMA_LECTURA' },
  { label: 'Reconexión', value: 'RECONEXION' },
  { label: 'Instalación', value: 'INSTALACION' },
  { label: 'Inspección', value: 'INSPECCION' },
];

/**
 * Opciones de filtro por estado de la ruta.
 */
export const STATE_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Todos los estados', value: 'ALL' },
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'En Progreso', value: 'EN_PROGRESO' },
  { label: 'Completadas', value: 'COMPLETADA' },
];

