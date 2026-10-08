import { describe, it, expect } from 'vitest';
import {
  isReadingRouteType,
  routeMatchesTypeFilter,
  resolveOrderRecord,
  isOrderCompletedRule,
  getActionableWorkOrders,
  type AssignedWorkOrder,
  type ReadingRecord,
} from './reading-order.rules';
import type { WorkOrderActivityType } from '../../rutas/domain/operator.models';
import type { IMeterDto } from '../../../contracts/meters/domain/models/meter.model';

describe('reading-order.rules', () => {
  describe('isReadingRouteType & routeMatchesTypeFilter', () => {
    it('identifies LECTURA as reading route type', () => {
      expect(isReadingRouteType('LECTURA')).toBe(true);
      expect(isReadingRouteType('INSTALACION')).toBe(false);
      expect(isReadingRouteType(null)).toBe(false);
    });

    it('matches filter correctly', () => {
      expect(routeMatchesTypeFilter('LECTURA', 'ALL')).toBe(true);
      expect(routeMatchesTypeFilter('LECTURA', 'LECTURA')).toBe(true);
      expect(routeMatchesTypeFilter('INSTALACION', 'LECTURA')).toBe(false);
    });
  });

  describe('resolveOrderRecord', () => {
    const record: ReadingRecord = {
      lecturaId: '10',
      estado: 'POR_REVISION',
      lecturaActual: 45,
      lecturaAnterior: 30,
      fecha: '2026-03-31',
    };

    it('finds record by medidorId', () => {
      const map = new Map<string, ReadingRecord>([['5', record]]);
      const meter: IMeterDto = {
        medidorId: 5,
        serie: 'M-005',
        marca: 'Actaris',
        modelo: 'X',
        clienteNombre: 'Test',
        direccionSuministro: 'Calle 1',
        contratoId: '100',
        fechaInstalacion: '2025-01-01',
      };
      expect(resolveOrderRecord(meter, map)).toEqual(record);
    });

    it('finds record by numeroGuia / numeroContrato', () => {
      const map = new Map<string, ReadingRecord>([['GUIA-999', record]]);
      const meter: IMeterDto = {
        medidorId: -5,
        serie: 'GUIA-999',
        numeroGuia: 'GUIA-999',
        marca: 'Actaris',
        modelo: 'X',
        clienteNombre: 'Test',
        direccionSuministro: 'Calle 1',
        contratoId: '100',
        fechaInstalacion: '2025-01-01',
      };
      expect(resolveOrderRecord(meter, map)).toEqual(record);
    });

    it('finds record by OT ID', () => {
      const map = new Map<string, ReadingRecord>([['OT-42', record]]);
      const workOrders = new Map<string, Map<WorkOrderActivityType, AssignedWorkOrder>>([
        ['M-005', new Map([['LECTURA', { id: '42', estado: 'PENDIENTE' }]])],
      ]);
      const meter: IMeterDto = {
        medidorId: 5,
        serie: 'M-005',
        marca: 'Actaris',
        modelo: 'X',
        clienteNombre: 'Test',
        direccionSuministro: 'Calle 1',
        contratoId: '100',
        fechaInstalacion: '2025-01-01',
      };
      expect(resolveOrderRecord(meter, map, workOrders)).toEqual(record);
    });
  });

  describe('isOrderCompletedRule', () => {
    const meter: IMeterDto = {
      medidorId: 1,
      serie: 'M-1',
      marca: 'Test',
      modelo: 'T1',
      clienteNombre: 'Juan',
      direccionSuministro: 'Dir',
      contratoId: '10',
      fechaInstalacion: '2025-01-01',
    };

    it('returns false if existing record is PENDIENTE or RECHAZADA_VERIFICACION', () => {
      expect(
        isOrderCompletedRule({
          meter,
          existingRecord: {
            lecturaId: '1',
            estado: 'PENDIENTE',
            lecturaActual: 0,
            lecturaAnterior: 0,
            fecha: '',
          },
        }),
      ).toBe(false);

      expect(
        isOrderCompletedRule({
          meter,
          existingRecord: {
            lecturaId: '1',
            estado: 'RECHAZADA_VERIFICACION',
            lecturaActual: 0,
            lecturaAnterior: 0,
            fecha: '',
          },
        }),
      ).toBe(false);
    });

    it('returns true if existing record is POR_REVISION, APROBADA or COMPLETADA', () => {
      expect(
        isOrderCompletedRule({
          meter,
          existingRecord: {
            lecturaId: '1',
            estado: 'POR_REVISION',
            lecturaActual: 10,
            lecturaAnterior: 5,
            fecha: '',
          },
        }),
      ).toBe(true);

      expect(
        isOrderCompletedRule({
          meter,
          existingRecord: {
            lecturaId: '1',
            estado: 'APROBADA',
            lecturaActual: 10,
            lecturaAnterior: 5,
            fecha: '',
          },
        }),
      ).toBe(true);
    });

    it('returns true if series or id is in readMetersIds', () => {
      expect(
        isOrderCompletedRule({
          meter,
          readMetersIds: new Set(['M-1']),
        }),
      ).toBe(true);
    });
  });

  describe('getActionableWorkOrders', () => {
    const meter: IMeterDto = {
      medidorId: 1,
      serie: 'M-1',
      marca: 'Test',
      modelo: 'T1',
      clienteNombre: 'Juan',
      direccionSuministro: 'Dir',
      contratoId: '10',
      fechaInstalacion: '2025-01-01',
    };

    it('excludes LECTURA when reading is already taken', () => {
      const woMap = new Map<string, Map<WorkOrderActivityType, AssignedWorkOrder>>([
        ['M-1', new Map([['LECTURA', { id: '10', estado: 'PENDIENTE' }]])],
      ]);
      const existing: ReadingRecord = {
        lecturaId: '5',
        estado: 'POR_REVISION',
        lecturaActual: 15,
        lecturaAnterior: 10,
        fecha: '',
      };
      const actionable = getActionableWorkOrders(meter, woMap, existing);
      expect(actionable.length).toBe(0);
    });

    it('includes LECTURA when reading is RECHAZADA_VERIFICACION', () => {
      const woMap = new Map<string, Map<WorkOrderActivityType, AssignedWorkOrder>>([
        ['M-1', new Map([['LECTURA', { id: '10', estado: 'PENDIENTE' }]])],
      ]);
      const existing: ReadingRecord = {
        lecturaId: '5',
        estado: 'RECHAZADA_VERIFICACION',
        lecturaActual: 15,
        lecturaAnterior: 10,
        fecha: '',
      };
      const actionable = getActionableWorkOrders(meter, woMap, existing);
      expect(actionable.length).toBe(1);
    });
  });
});
