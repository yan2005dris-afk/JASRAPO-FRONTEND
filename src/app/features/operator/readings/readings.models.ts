/**
 * Modelos e interfaces usados por el componente de lecturas del operador.
 * Separados del componente para mejor mantenibilidad y reuso.
 */

/** Información de un estado de lectura (desde el catálogo del backend). */
export interface EstadoInfo {
  codigo: string;
  nombre: string;
  orden: number;
  icono: string;
}

/** Chip de filtro por estado en la pantalla de lecturas. */
export interface EstadoChip {
  value: string;
  label: string;
  icon: string;
}

/** Agrupación de medidores por estado de lectura. */
export interface MeterGroup {
  estado: string;
  info: {
    label: string;
    icon: string;
    cssClass: string | null;
  };
  meters: import('../../contracts/meters/interfaces/imeter.interface').IMeterDto[];
}

/** Pasos del flujo de ingreso de lectura en pantalla móvil. */
export type MobileStep = 'search' | 'actions' | 'form';

/** Estado discriminado único de la máquina de estados de Lecturas */
export type LecturaState =
  | { kind: 'search' }
  | {
      kind: 'actions';
      meter: import('../../contracts/meters/interfaces/imeter.interface').IMeterDto;
    }
  | {
      kind: 'form';
      meter: import('../../contracts/meters/interfaces/imeter.interface').IMeterDto;
      tipo: import('../models/operator.models').WorkOrderActivityType;
    };

/** Orden estándar de grupos de estado para visualización consistente. */
export const READING_STATE_ORDER: string[] = [
  '__SIN_LECTURA__',
  'PENDIENTE',
  'POR_REVISION',
  'RECHAZADA_VERIFICACION',
  'APROBADA',
  'ESTIMADA',
  'PLANILLADA',
  'CON_NOVEDAD',
];

/** Catálogo de estados offline (fallback cuando no hay conexión al backend). */
export const ESTADOS_FALLBACK: EstadoInfo[] = [
  { codigo: 'PENDIENTE', nombre: 'Pendiente', orden: 1, icono: 'bi-clock' },
  { codigo: 'POR_REVISION', nombre: 'Por Revisión', orden: 2, icono: 'bi-eye' },
  { codigo: 'APROBADA', nombre: 'Aprobada', orden: 3, icono: 'bi-check-circle' },
  { codigo: 'RECHAZADA_VERIFICACION', nombre: 'Rechazada', orden: 4, icono: 'bi-x-circle-fill' },
  { codigo: 'ESTIMADA', nombre: 'Estimada', orden: 5, icono: 'bi-graph-up' },
  { codigo: 'PLANILLADA', nombre: 'Planillada', orden: 6, icono: 'bi-receipt' },
  { codigo: 'CON_NOVEDAD', nombre: 'Con Novedad', orden: 7, icono: 'bi-exclamation-triangle' },
];
