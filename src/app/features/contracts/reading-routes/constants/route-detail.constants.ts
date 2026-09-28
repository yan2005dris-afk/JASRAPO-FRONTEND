import { EstadoOrden, TipoActividad, TipoRuta } from '../interfaces/ireading-route.interface';

/**
 * Single source of truth for badge CSS classes, labels and human-readable
 * strings used by the route detail view.
 *
 * Replaces the previous inline switches (`getOrdenEstadoCssClass`,
 * `getOrdenTipoCssClass`, `getTipoActividadLabel`, `getTipoLabel`) which mixed
 * pure data with execution flow.
 *
 * All maps are typed as `Record<UnionType, string>` so adding a new state or
 * activity type to the union causes a TypeScript error here instead of a
 * silent "no match" branch at runtime.
 */

export const ESTADO_ORDEN_BADGE: Record<EstadoOrden, string> = {
  COMPLETADA: 'bg-success',
  EN_PROGRESO: 'bg-warning text-dark',
  PENDIENTE: 'bg-secondary',
  FALLIDA: 'bg-danger',
  CANCELADA: 'bg-danger',
};

export const ESTADO_ORDEN_FALLBACK_BADGE = 'bg-secondary';

export const TIPO_ACTIVIDAD_BADGE: Record<TipoActividad, string> = {
  LECTURA: 'bg-primary',
  INSTALACION: 'bg-success',
  RECONEXION: 'bg-warning text-dark',
  INSPECCION: 'bg-purple',
};

export const TIPO_ACTIVIDAD_FALLBACK_BADGE = 'bg-secondary';

export const TIPO_ACTIVIDAD_LABEL: Record<TipoActividad, string> = {
  LECTURA: 'Lectura',
  INSTALACION: 'Instalación',
  RECONEXION: 'Reconexión',
  INSPECCION: 'Inspección',
};

export const TIPO_RUTA_LABEL: Record<TipoRuta, string> = {
  TOMA_LECTURA: 'Toma de Lectura',
  LECTURA: 'Lectura',
  CORTE: 'Corte',
  RECONEXION: 'Reconexión',
  INSTALACION: 'Instalación',
  INSPECCION: 'Inspección',
};

/**
 * Default fallback CSS class when a value comes from the backend as a string
 * outside the known unions (forward-compat).
 */
export const FALLBACK_BADGE = 'bg-secondary';

/**
 * State filter values accepted by the orders table tab UI and their
 * backend-side `estado` query string. Centralised so the filter component
 * and the loader agree on the wire format.
 */
export const ESTADO_FILTER_MAP: Record<
  'PENDIENTES' | 'COMPLETADAS' | 'NOVEDAD' | 'TODAS',
  string | undefined
> = {
  TODAS: undefined,
  PENDIENTES: 'PENDIENTE,EN_PROGRESO',
  COMPLETADAS: 'COMPLETADA',
  NOVEDAD: 'FALLIDA',
};