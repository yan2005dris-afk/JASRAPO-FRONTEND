import { describe, expect, it } from 'vitest';
import {
  clearAssignmentsForOperator,
  groupContractAssignmentsByOperatorCommunity,
  groupSectorAssignmentsByOperatorCommunity,
  resolveAssignmentStatus,
  toggleAssignment,
} from './assignment.rules';
import { IReadingRoute } from '../../models/reading-route.model';

describe('session-assignments.helpers', () => {
  describe('toggleAssignment', () => {
    it('assigns a free key to the current operator and returns the next map', () => {
      const current = new Map<number, number>();
      const result = toggleAssignment(current, 42, 1, { isDbAssigned: false });

      expect(result.kind).toBe('assigned');
      if (result.kind === 'assigned') {
        expect(result.next.get(42)).toBe(1);
      }
      // input is never mutated
      expect(current.has(42)).toBe(false);
    });

    it('deselects when the key is already owned by the current operator', () => {
      const current = new Map<number, number>([[42, 1]]);
      const result = toggleAssignment(current, 42, 1, {
        isDbAssigned: false,
      });

      expect(result.kind).toBe('deselected');
      if (result.kind === 'deselected') {
        expect(result.next.has(42)).toBe(false);
      }
    });

    it('blocks when the key is already in the database', () => {
      const current = new Map<number, number>();
      const result = toggleAssignment(current, 42, 1, { isDbAssigned: true });

      expect(result.kind).toBe('blocked-by-db');
    });

    it('blocks when the key is session-assigned to another operator and reports the existing operator id', () => {
      const current = new Map<number, number>([[42, 2]]);
      const result = toggleAssignment(current, 42, 1, {
        isDbAssigned: false,
      });

      expect(result.kind).toBe('blocked-by-other-operator');
      if (result.kind === 'blocked-by-other-operator') {
        expect(result.existingOperatorId).toBe(2);
      }
      // input is never mutated
      expect(current.get(42)).toBe(2);
    });
  });

  describe('clearAssignmentsForOperator', () => {
    it('removes only entries owned by the given operator and returns a new map', () => {
      const source = new Map<number, number>([
        [1, 10],
        [2, 11],
        [3, 10],
        [4, 12],
      ]);

      const result = clearAssignmentsForOperator(source, 10);

      expect([...result.entries()]).toEqual([
        [2, 11],
        [4, 12],
      ]);
      expect(source.has(1)).toBe(true);
    });

    it('returns an empty map when no entry matches', () => {
      const source = new Map<number, number>([[1, 5]]);
      const result = clearAssignmentsForOperator(source, 7);

      expect(result.size).toBe(1);
    });
  });

  describe('groupSectorAssignmentsByOperatorCommunity', () => {
    it('groups sectors by operator and community, dropping sectors missing from the catalog', () => {
      const assignments = new Map<number, number>([
        [1, 100],
        [2, 100],
        [3, 200],
        [99, 100], // not in catalog
      ]);
      const sectores = [
        { sectorId: 1, comunidadId: 10 },
        { sectorId: 2, comunidadId: 10 },
        { sectorId: 3, comunidadId: 20 },
      ];

      const result = groupSectorAssignmentsByOperatorCommunity(assignments, sectores);

      expect(result.get(100)?.get(10)).toEqual([1, 2]);
      expect(result.get(200)?.get(20)).toEqual([3]);
      expect(result.get(100)?.get(99)).toBeUndefined();
    });

    it('returns an empty map when there are no assignments', () => {
      const result = groupSectorAssignmentsByOperatorCommunity(new Map(), []);
      expect(result.size).toBe(0);
    });
  });

  describe('groupContractAssignmentsByOperatorCommunity', () => {
    it('groups contracts by operator and community using the catalog for resolution', () => {
      const assignments = new Map<number, number>([
        [100, 7],
        [101, 7],
        [102, 8],
      ]);
      const contracts = [
        { contratoId: 100, comunidadId: 5 },
        { contratoId: 101, comunidadId: 5 },
        { contratoId: 102, comunidadId: 6 },
        { contratoId: 999, comunidadId: 99 }, // not in session
      ];

      const result = groupContractAssignmentsByOperatorCommunity(assignments, contracts);

      expect(result.get(7)?.get(5)).toEqual([100, 101]);
      expect(result.get(8)?.get(6)).toEqual([102]);
    });
  });

  describe('resolveAssignmentStatus', () => {
    const operarios = [
      { usuarioId: 1, nombres: 'Ana', apellidos: 'Pérez' },
      { usuarioId: 2, nombres: 'Luis', apellidos: 'Gómez' },
    ];
    const dbMap = new Map<number, IReadingRoute>();
    const sessionMap = new Map<number, number>();
    const getColor = (id: number) => ({ name: `color-${id}` });
    const fallbackName = (id: number) => `Operario #${id}`;

    it('returns unassigned when the key is null', () => {
      const status = resolveAssignmentStatus({
        id: null,
        dbMap,
        sessionMap,
        operarios,
        selectedOperarioId: 1,
        getOperatorColor: getColor,
        fallbackName,
      });
      expect(status).toEqual({
        isAssigned: false,
        isDbAssigned: false,
        isCurrentOperator: false,
      });
    });

    it('prefers the DB route over the session assignment and sets routeName', () => {
      const dbMapWithRoute = new Map<number, IReadingRoute>([
        [5, { operarioId: 2, nombre: 'Ruta Oct', sectorId: 5 } as IReadingRoute],
      ]);
      const sessionMapWithConflict = new Map<number, number>([[5, 1]]);

      const status = resolveAssignmentStatus({
        id: 5,
        dbMap: dbMapWithRoute,
        sessionMap: sessionMapWithConflict,
        operarios,
        selectedOperarioId: 1,
        getOperatorColor: getColor,
        fallbackName,
      });

      expect(status.isDbAssigned).toBe(true);
      expect(status.operarioId).toBe(2);
      expect(status.routeName).toBe('Ruta Oct');
      expect(status.isCurrentOperator).toBe(false);
    });

    it('falls back to the session assignment when no DB route exists', () => {
      const sessionMapWithOp = new Map<number, number>([[5, 1]]);

      const status = resolveAssignmentStatus({
        id: 5,
        dbMap,
        sessionMap: sessionMapWithOp,
        operarios,
        selectedOperarioId: 1,
        getOperatorColor: getColor,
        fallbackName,
      });

      expect(status.isDbAssigned).toBe(false);
      expect(status.isAssigned).toBe(true);
      expect(status.operarioName).toBe('Ana Pérez');
      expect(status.isCurrentOperator).toBe(true);
    });

    it('falls back to the formatted fallback name when the operator is not in the catalog', () => {
      const sessionMapWithUnknownOp = new Map<number, number>([[5, 99]]);

      const status = resolveAssignmentStatus({
        id: 5,
        dbMap,
        sessionMap: sessionMapWithUnknownOp,
        operarios,
        selectedOperarioId: 1,
        getOperatorColor: getColor,
        fallbackName,
      });

      expect(status.operarioName).toBe('Operario #99');
    });
  });
});
