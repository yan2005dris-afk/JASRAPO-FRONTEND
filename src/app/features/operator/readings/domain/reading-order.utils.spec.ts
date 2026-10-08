import { describe, expect, it } from 'vitest';
import type { OperatorRouteResponse, OperatorWorkOrder } from '../../rutas/domain/operator.models';
import {
  compareRoutesCanonically,
  nextPendingWorkOrder,
  routeMatchesTypeFilter,
} from './reading-order.rules';

function route(partial: Partial<OperatorRouteResponse>): OperatorRouteResponse {
  return {
    rutaId: partial.rutaId ?? 'r-1',
    tipoRuta: 'LECTURA',
    nombre: 'Ruta',
    estado: 'PENDIENTE',
    operarioId: 1,
    comunidadId: 1,
    medidor: null,
    operario: { usuarioId: 1, nombres: 'Ana', apellidos: 'Lopez' },
    ...partial,
  };
}

describe('compareRoutesCanonically', () => {
  it('orders first by comunidadId', () => {
    const a = route({ comunidadId: 2 });
    const b = route({ comunidadId: 1 });
    expect([a, b].sort(compareRoutesCanonically).map((r) => r.comunidadId)).toEqual([1, 2]);
  });

  it('orders by sectorId within the same comunidadId', () => {
    const a = route({ comunidadId: 1, sectorId: 3 });
    const b = route({ comunidadId: 1, sectorId: 1 });
    expect([a, b].sort(compareRoutesCanonically).map((r) => r.sectorId)).toEqual([1, 3]);
  });

  it('orders by rutaId within the same comunidadId/sectorId', () => {
    const a = route({ comunidadId: 1, sectorId: 1, rutaId: '5' });
    const b = route({ comunidadId: 1, sectorId: 1, rutaId: '2' });
    expect([a, b].sort(compareRoutesCanonically).map((r) => r.rutaId)).toEqual(['2', '5']);
  });

  it('treats missing sectorId as the lowest value', () => {
    const missing = route({ comunidadId: 1, sectorId: undefined });
    const withValues = route({ comunidadId: 1, sectorId: 4 });
    expect(compareRoutesCanonically(missing, withValues)).toBeLessThan(0);
  });
});

describe('routeMatchesTypeFilter', () => {
  it('matches the backend LECTURA value with the reading filter', () => {
    expect(routeMatchesTypeFilter('LECTURA', 'LECTURA')).toBe(true);
  });

  it('keeps legacy LECTURA cache entries visible in the reading filter', () => {
    expect(routeMatchesTypeFilter('LECTURA', 'LECTURA')).toBe(true);
  });

  it('does not include a non-reading route in the reading filter', () => {
    expect(routeMatchesTypeFilter('INSPECCION', 'LECTURA')).toBe(false);
  });

  it('matches every route when the ALL filter is active', () => {
    expect(routeMatchesTypeFilter('RECONEXION', 'ALL')).toBe(true);
  });
});

function workOrder(partial: Partial<OperatorWorkOrder>): OperatorWorkOrder {
  return {
    ordenTrabajoId: partial.ordenTrabajoId ?? 'wo-1',
    rutaId: partial.rutaId ?? 'r-1',
    tipoActividad: partial.tipoActividad ?? 'LECTURA',
    estado: partial.estado ?? 'PENDIENTE',
    ordenVisita: partial.ordenVisita ?? 1,
    contratoId: partial.contratoId ?? 'c-1',
    medidor: partial.medidor ?? {
      medidorId: 'm-1',
      serie: 'SERIE-1',
    },
    contrato: {
      numeroContrato: 'C-1',
      clienteNombre: 'Cliente',
      direccion: 'Dirección',
      latitud: -0.9677,
      longitud: -80.7089,
    },
    ...partial,
  };
}

describe('nextPendingWorkOrder', () => {
  it('returns the first PENDIENTE work order by ordenVisita ascending, even out of array order', () => {
    const task = route({
      ordenesTrabajo: [
        workOrder({ ordenVisita: 3, ordenTrabajoId: 'wo-3' }),
        workOrder({ ordenVisita: 1, ordenTrabajoId: 'wo-1' }),
        workOrder({ ordenVisita: 2, ordenTrabajoId: 'wo-2', estado: 'EN_PROGRESO' }),
      ],
    });
    expect(nextPendingWorkOrder(task)?.ordenTrabajoId).toBe('wo-1');
  });

  it('skips non-PENDIENTE orders entirely', () => {
    const task = route({
      ordenesTrabajo: [
        workOrder({ ordenVisita: 1, ordenTrabajoId: 'wo-cancel', estado: 'CANCELADA' }),
        workOrder({ ordenVisita: 2, ordenTrabajoId: 'wo-done', estado: 'COMPLETADA' }),
      ],
    });
    expect(nextPendingWorkOrder(task)).toBeNull();
  });

  it('skips work orders whose contract has no coordinates', () => {
    const task = route({
      ordenesTrabajo: [
        workOrder({ ordenVisita: 1, ordenTrabajoId: 'wo-no-coords', contrato: undefined }),
        workOrder({ ordenVisita: 2, ordenTrabajoId: 'wo-with-coords' }),
      ],
    });
    expect(nextPendingWorkOrder(task)?.ordenTrabajoId).toBe('wo-with-coords');
  });

  it('prefers the administrative visit order, NOT the closest point (no min-Haversine)', () => {
    const task = route({
      ordenesTrabajo: [
        // Farther in visit order but geographically near the current position.
        workOrder({
          ordenVisita: 1,
          ordenTrabajoId: 'wo-first-visit',
          contrato: {
            numeroContrato: 'C-x',
            clienteNombre: 'X',
            direccion: 'X',
            latitud: 41.3874,
            longitud: 2.1686,
          },
        }),
        // First PENDIENTE by ordenVisita must win regardless of distance.
        workOrder({
          ordenVisita: 2,
          ordenTrabajoId: 'wo-second-visit',
          contrato: {
            numeroContrato: 'C-y',
            clienteNombre: 'Y',
            direccion: 'Y',
            latitud: -0.9677,
            longitud: -80.7089,
          },
        }),
      ],
    });
    expect(nextPendingWorkOrder(task)?.ordenTrabajoId).toBe('wo-first-visit');
  });

  it('returns null when there are no work orders', () => {
    expect(nextPendingWorkOrder(route({}))).toBeNull();
  });
});
