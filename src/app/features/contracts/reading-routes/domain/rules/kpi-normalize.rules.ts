import { IReading } from '../../../readings/interfaces/ireading.interface';
import { IReadingRowItem } from '../../../readings/components/readings-table/readings-table.component';
import {
  ILecturaKpis,
  IReadingForRoute,
  IRouteKpis,
} from '../../models/reading-route.model';

/**
 * The backend exposes two KPI shapes for the same conceptual counters:
 *   - readings endpoint uses `aprobadas` / `rechazadas`
 *   - orders endpoint uses `completadas` / `canceladas`
 *
 * The component consumes a single `IRouteKpis` shape. This mapper unifies the
 * reading shape into the unified one so the UI getters can stay agnostic of
 * the route type.
 *
 * Pure function — no DI, no side effects. Safe to import anywhere.
 */
export function mapLecturaKpisToRouteKpis(k: ILecturaKpis | undefined | null): IRouteKpis | null {
  if (!k) return null;
  return {
    total: k.total,
    completadas: k.aprobadas ?? 0,
    pendientes: k.pendientes ?? 0,
    conNovedad: k.conNovedad ?? 0,
    canceladas: k.rechazadas ?? 0,
  };
}

/**
 * Adapter `IReadingForRoute` (wire-shape for the readings table) into
 * `IReadingRowItem` (table-component input). The mapping is mostly a
 * rename of `estadoLectura` to `estado` plus propagation of the parent
 * route state so the table can disable actions when the route is closed.
 */
export function mapReadingForRouteToRow(
  r: IReadingForRoute,
  routeEstado?: string,
): IReadingRowItem {
  return {
    lecturaId: r.lecturaId,
    guia: r.guia,
    clienteNombre: r.clienteNombre,
    direccion: r.direccion,
    sector: r.sector,
    medidorSerie: r.medidorSerie,
    lecturaAnterior: r.lecturaAnterior,
    lecturaActual: r.lecturaActual,
    consumoCalculado: r.consumoCalculado,
    estado: r.estadoLectura ?? 'PENDIENTE',
    routeEstado,
  };
}

/**
 * When the readings-detail fetch fails the modal still needs something to
 * render. We build a minimal `IReading` from the table row so the user can
 * see what they already saw on the table instead of a generic error.
 *
 * The fallback intentionally mirrors the structure produced by the backend
 * when the join succeeds, so downstream consumers do not need to branch on
 * "is this a real reading or a fallback?".
 */
export function buildReadingFallback(row: IReadingRowItem, routeEstado?: string): IReading {
  return {
    lecturaId: String(row.lecturaId),
    fecha: (row.fecha as string | Date) ?? new Date().toISOString(),
    lecturaAnterior: row.lecturaAnterior ?? 0,
    lecturaActual: row.lecturaActual ?? 0,
    consumoCalculado: row.consumoCalculado ?? 0,
    contratoId: String(row.contratoId ?? ''),
    descripcionAnomalia: null,
    fechaValidacion: null,
    isValidada: false,
    lecturaInicial: false,
    periodoId: 0,
    tieneAnomalia: row.tieneAnomalia ?? false,
    estado: row.estado,
    routeEstado,
    contrato: row.clienteNombre
      ? {
          contratoId: String(row.contratoId ?? ''),
          numeroGuia: row.guia ?? '',
          direccionSuministro: row.direccion ?? '',
          estado: '',
          cliente: {
            clienteId: '',
            nombres: row.clienteNombre ?? '',
            apellidos: '',
            identificacion: '',
          },
          sector: row.sector ? { nombre: row.sector } : null,
        }
      : null,
    medidor: row.medidorSerie
      ? { medidorId: '', serie: row.medidorSerie, marca: '', modelo: '' }
      : null,
    periodoRel: null,
  };
}
