import { describe, expect, it } from 'vitest';
import {
  buildReadingFallback,
  mapLecturaKpisToRouteKpis,
  mapReadingForRouteToRow,
} from './kpi-normalize.rules';
import { IReadingRowItem } from '../../../readings/components/readings-table/readings-table.component';
import { IReadingForRoute } from '../../models/reading-route.model';

describe('route-kpis.mapper', () => {
  describe('mapLecturaKpisToRouteKpis', () => {
    it('unifies lectura kpis (aprobadas/rechazadas) into the route kpis shape (completadas/canceladas)', () => {
      const result = mapLecturaKpisToRouteKpis({
        total: 10,
        aprobadas: 6,
        pendientes: 2,
        conNovedad: 1,
        rechazadas: 1,
      });

      expect(result).toEqual({
        total: 10,
        completadas: 6,
        pendientes: 2,
        conNovedad: 1,
        canceladas: 1,
      });
    });

    it('returns null when the input is null or undefined (no kpis returned by the backend)', () => {
      expect(mapLecturaKpisToRouteKpis(null)).toBeNull();
      expect(mapLecturaKpisToRouteKpis(undefined)).toBeNull();
    });

    it('defaults missing aprobadas/rechazadas to zero when the backend omits them', () => {
      const result = mapLecturaKpisToRouteKpis({
        total: 5,
        pendientes: 3,
        conNovedad: 1,
      } as never);

      expect(result?.completadas).toBe(0);
      expect(result?.canceladas).toBe(0);
    });
  });

  describe('mapReadingForRouteToRow', () => {
    it('renames estadoLectura to estado and propagates the route state so the table can disable actions', () => {
      const row = mapReadingForRouteToRow(
        {
          lecturaId: 'L-1',
          guia: 'G-1',
          clienteNombre: 'Juan',
          direccion: 'Calle 1',
          sector: 'Norte',
          medidorSerie: 'M-001',
          lecturaAnterior: 100,
          lecturaActual: 110,
          consumoCalculado: 10,
          estadoLectura: 'APROBADA',
        } as IReadingForRoute,
        'EN_PROGRESO',
      );

      expect(row.estado).toBe('APROBADA');
      expect(row.routeEstado).toBe('EN_PROGRESO');
      expect(row.lecturaId).toBe('L-1');
    });

    it('defaults estado to PENDIENTE when the backend does not send estadoLectura', () => {
      const row = mapReadingForRouteToRow(
        { lecturaId: 'L-2', guia: 'G-2', clienteNombre: '', direccion: '' } as IReadingForRoute,
        undefined,
      );

      expect(row.estado).toBe('PENDIENTE');
      expect(row.routeEstado).toBeUndefined();
    });
  });

  describe('buildReadingFallback', () => {
    const baseRow: IReadingRowItem = {
      lecturaId: 'L-9',
      guia: 'G-9',
      clienteNombre: 'Cliente Test',
      direccion: 'Calle 9',
      sector: 'Sur',
      medidorSerie: 'M-009',
      lecturaAnterior: 100,
      lecturaActual: 115,
      consumoCalculado: 15,
      estado: 'PENDIENTE',
    };

    it('builds a minimal IReading so the modal can render even when the detail fetch fails', () => {
      const fallback = buildReadingFallback(baseRow, 'EN_PROGRESO');

      expect(fallback.lecturaId).toBe('L-9');
      expect(fallback.lecturaAnterior).toBe(100);
      expect(fallback.lecturaActual).toBe(115);
      expect(fallback.consumoCalculado).toBe(15);
      expect(fallback.estado).toBe('PENDIENTE');
      expect(fallback.routeEstado).toBe('EN_PROGRESO');
      expect(fallback.contrato?.numeroGuia).toBe('G-9');
      expect(fallback.contrato?.cliente?.nombres).toBe('Cliente Test');
      expect(fallback.contrato?.sector?.nombre).toBe('Sur');
      expect(fallback.medidor?.serie).toBe('M-009');
    });

    it('omits contrato and medidor when the row has no clienteNombre and no medidorSerie', () => {
      const fallback = buildReadingFallback(
        { ...baseRow, clienteNombre: undefined, medidorSerie: undefined },
        undefined,
      );

      expect(fallback.contrato).toBeNull();
      expect(fallback.medidor).toBeNull();
    });
  });
});
