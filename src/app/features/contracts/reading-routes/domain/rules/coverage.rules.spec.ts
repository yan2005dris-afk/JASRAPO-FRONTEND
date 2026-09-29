import { describe, expect, it } from 'vitest';
import { calculateGlobalCoverage, calculateNonLecturaCoverage } from './coverage.rules';

describe('coverage-calculator', () => {
  describe('calculateGlobalCoverage', () => {
    it('classifies communities into completed/partial/unassigned and aggregates sector counts', () => {
      const comunidades = [
        { id: 1, nombre: 'A' },
        { id: 2, nombre: 'B' },
        { id: 3, nombre: 'C' },
        { id: 4, nombre: 'D' }, // no sectors → treated as 1 unit
      ];
      const coverageByCommunity: Record<number, { assigned: number; total: number }> = {
        1: { assigned: 2, total: 2 },
        2: { assigned: 1, total: 3 },
        3: { assigned: 0, total: 0 },
        4: { assigned: 1, total: 1 },
      };

      const result = calculateGlobalCoverage(comunidades, (id) => coverageByCommunity[id]);

      expect(result.fullyCompletedCommunities).toBe(2); // 1 and 4
      expect(result.partialCommunities).toBe(1); // 2
      expect(result.unassignedCommunities).toBe(1); // 3
      expect(result.totalSectors).toBe(6);
      expect(result.totalAssignedSectors).toBe(4);
      expect(result.pendingSectors).toBe(2);
      expect(result.totalCommunities).toBe(4);
      expect(result.completedPct).toBe(50);
    });

    it('skips communities with a null id (matches the original computed)', () => {
      const comunidades = [
        { id: null, nombre: 'Skip' },
        { id: 1, nombre: 'A' },
      ];
      const result = calculateGlobalCoverage(comunidades, (id) =>
        id === 1 ? { assigned: 1, total: 1 } : { assigned: 0, total: 0 },
      );

      expect(result.totalCommunities).toBe(2); // count includes null-id
      expect(result.fullyCompletedCommunities).toBe(1);
    });

    it('returns 0% completed when no communities exist', () => {
      const result = calculateGlobalCoverage([], () => ({ assigned: 0, total: 0 }));
      expect(result.completedPct).toBe(0);
      expect(result.totalCommunities).toBe(0);
    });
  });

  describe('calculateNonLecturaCoverage', () => {
    it('computes pending contracts and counts distinct communities with at least one assignment', () => {
      const assignments = new Map<number, number>([
        [10, 1],
        [11, 1],
        [12, 2],
      ]);
      const contracts = [
        { contratoId: 10, comunidadId: 5 },
        { contratoId: 11, comunidadId: 5 },
        { contratoId: 12, comunidadId: 6 },
        { contratoId: 99, comunidadId: 9 },
      ];

      const result = calculateNonLecturaCoverage(20, assignments, contracts);

      expect(result.totalContratosEnComunidad).toBe(20);
      expect(result.assignedContratosCount).toBe(3);
      expect(result.pendingContratos).toBe(17);
      expect(result.comunidadesConContratos).toBe(2); // 5 and 6
    });

    it('returns 0 pending when all contracts in the community are assigned', () => {
      const assignments = new Map<number, number>([[10, 1]]);
      const contracts = [{ contratoId: 10, comunidadId: 5 }];

      const result = calculateNonLecturaCoverage(1, assignments, contracts);
      expect(result.pendingContratos).toBe(0);
      expect(result.comunidadesConContratos).toBe(1);
    });

    it('clamps pendingContratos at zero when total < assigned (defensive)', () => {
      const assignments = new Map<number, number>([
        [10, 1],
        [11, 1],
      ]);

      const result = calculateNonLecturaCoverage(1, assignments, []);
      expect(result.pendingContratos).toBe(0);
    });
  });
});
