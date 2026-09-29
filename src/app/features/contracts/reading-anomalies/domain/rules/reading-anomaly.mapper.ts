import { IReadingAnomaly, IWorkOrderNoveltyRaw } from '../models/reading-anomaly.model';

/**
 * Convierte un item del wire shape (`IWorkOrderNoveltyRaw`, lo que devuelve
 * el backend en GET /work-order-novelties) al domain shape
 * (`IReadingAnomaly`, lo que consume la UI).
 *
 * Reglas de normalización:
 *   - `anomaliaId` se resuelve desde `novedadId` o `anomaliaId`
 *     (el backend usa ambos nombres según la versión).
 *   - Los IDs numéricos se convierten a `string` para consistencia
 *     con el resto de la app.
 *   - Los campos opcionales del backend se transforman a `null`
 *     (en lugar de `undefined`) cuando están vacíos.
 *   - `consumoAjustado` se fuerza a `number` (puede venir como
 *     string desde el backend).
 *
 * Función pura, sin DI. Vive en `domain/rules/` (no en `data/`)
 * porque su lógica es de transformación de dominio, no de HTTP.
 */
export function mapNoveltyToAnomaly(item: IWorkOrderNoveltyRaw): IReadingAnomaly {
  const id = String(item.novedadId ?? item.anomaliaId ?? '');
  return {
    anomaliaId: id,
    novedadId: id,
    ordenTrabajoId: item.ordenTrabajoId ? String(item.ordenTrabajoId) : undefined,
    lecturaId: item.lecturaId ? String(item.lecturaId) : null,
    observacion: item.observacion ?? null,
    tipo: item.tipo,
    estado: item.estado,
    resolucionTipo: item.resolucionTipo ?? null,
    consumoAjustado: item.consumoAjustado !== undefined ? Number(item.consumoAjustado) : null,
    observacionResolucion: item.observacionResolucion ?? null,
    fotoUrl: item.fotoUrl ?? null,
    lectura: item.lectura ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
