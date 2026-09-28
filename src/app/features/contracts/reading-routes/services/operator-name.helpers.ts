/**
 * Pure name-resolution helpers for catalogs that components load from the
 * backend. Used by every view that displays an operario / comunidad name
 * inline (route list, route detail, assignment workspace, reassign modal).
 *
 * Both helpers intentionally accept the catalog as a parameter rather
 * than reading from a service, so the same call site works whether the
 * caller stores the catalog in a signal, a plain array, or a map.
 */

export interface OperarioLike {
  usuarioId: number;
  nombres: string;
  apellidos: string;
}

export interface ComunidadLike {
  id: number;
  nombre: string;
}

const DEFAULT_OPERARIO_FALLBACK = (id: number) => `Operario #${id}`;
const DEFAULT_COMUNIDAD_FALLBACK = (id: number) => `Comunidad #${id}`;

/**
 * Resolve an operario's display name from a catalog. Returns the
 * caller-provided fallback (default `Operario #<id>`) when the id is
 * nullish, the catalog is empty, or the id is not present.
 */
export function resolveOperarioNombre(
  operarios: readonly OperarioLike[] | null | undefined,
  operarioId: number | null | undefined,
  fallback: (id: number) => string = DEFAULT_OPERARIO_FALLBACK,
): string {
  if (operarioId == null) return 'Sin asignar';
  const op = operarios?.find((u) => u.usuarioId === operarioId);
  if (!op) return fallback(operarioId);
  return `${op.nombres} ${op.apellidos}`.trim();
}

/**
 * Resolve a comunidad's display name from a catalog. Returns
 * `Comunidad #<id>` when the id is not in the catalog. When `comunidadId`
 * is nullish the function returns an em-dash so it is safe to drop into
 * templates without an extra guard.
 */
export function resolveComunidadNombre(
  comunidades: readonly ComunidadLike[] | null | undefined,
  comunidadId: number | null | undefined,
  fallback: (id: number) => string = DEFAULT_COMUNIDAD_FALLBACK,
): string {
  if (comunidadId == null) return '—';
  const com = comunidades?.find((c) => c.id === comunidadId);
  if (!com) return fallback(comunidadId);
  return com.nombre;
}