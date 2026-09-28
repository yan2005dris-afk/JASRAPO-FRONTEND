/**
 * Pure coverage calculators for the route-assignment workspace summary.
 *
 * Both metrics lived inline as Angular `computed()` blocks in the original
 * component. The functions here are pure so they can be unit-tested
 * without spinning up a TestBed and reused if another view ever needs
 * the same coverage numbers.
 */

export interface CoverageByCommunity {
  /** Number of (sub-)units currently assigned inside the community. */
  assigned: number;
  /** Total (sub-)units in the community (sectors, or 1 if none). */
  total: number;
}

export interface GlobalCoverageSummary {
  fullyCompletedCommunities: number;
  partialCommunities: number;
  unassignedCommunities: number;
  totalSectors: number;
  totalAssignedSectors: number;
  pendingSectors: number;
  totalCommunities: number;
  completedPct: number;
}

/**
 * Calculate the global coverage across all communities for the
 * lectura/sectores flow. The caller passes a resolver that returns the
 * `assigned/total` counts for a given community so the helper does not
 * need to know how statuses are computed.
 *
 * Communities whose `id` is null/undefined are skipped (matches the
 * original computed).
 */
export function calculateGlobalCoverage<
  C extends { id: number | null | undefined },
>(
  comunidades: ReadonlyArray<C>,
  coverageResolver: (communityId: number) => CoverageByCommunity,
): GlobalCoverageSummary {
  let fullyCompletedCommunities = 0;
  let partialCommunities = 0;
  let unassignedCommunities = 0;
  let totalSectors = 0;
  let totalAssignedSectors = 0;

  for (const c of comunidades) {
    if (c.id == null) continue;
    const { assigned, total } = coverageResolver(c.id);
    totalSectors += total;
    totalAssignedSectors += assigned;
    if (total > 0 && assigned === total) {
      fullyCompletedCommunities++;
    } else if (assigned > 0) {
      partialCommunities++;
    } else {
      unassignedCommunities++;
    }
  }

  const totalCommunities = comunidades.length;
  const completedPct =
    totalCommunities > 0 ? Math.round((fullyCompletedCommunities / totalCommunities) * 100) : 0;

  return {
    fullyCompletedCommunities,
    partialCommunities,
    unassignedCommunities,
    totalSectors,
    totalAssignedSectors,
    pendingSectors: Math.max(0, totalSectors - totalAssignedSectors),
    totalCommunities,
    completedPct,
  };
}

export interface NonLecturaCoverageSummary {
  totalContratosEnComunidad: number;
  assignedContratosCount: number;
  pendingContratos: number;
  /** Distinct communities that have at least one contract assigned in session. */
  comunidadesConContratos: number;
}

/**
 * Coverage metrics for the non-lectura (contract-based) flow. The
 * `totalContratosEnComunidad` is passed explicitly because the workspace
 * counts contracts after a client-side filter (only contracts belonging
 * to the selected community), so it is not derivable from the contracts
 * array alone.
 */
export function calculateNonLecturaCoverage<
  C extends { contratoId: string | number; comunidadId: number },
>(
  totalContratosEnComunidad: number,
  sessionAssignments: ReadonlyMap<number, number>,
  contracts: ReadonlyArray<C>,
): NonLecturaCoverageSummary {
  const assignedContratosCount = sessionAssignments.size;
  const pendingContratos = Math.max(0, totalContratosEnComunidad - assignedContratosCount);

  const assignedComunidades = new Set<number>();
  const contractById = new Map<number, C>();
  for (const c of contracts) {
    contractById.set(Number(c.contratoId), c);
  }

  sessionAssignments.forEach((_opId, contratoId) => {
    const contract = contractById.get(contratoId);
    if (contract) {
      assignedComunidades.add(contract.comunidadId);
    }
  });

  return {
    totalContratosEnComunidad,
    assignedContratosCount,
    pendingContratos,
    comunidadesConContratos: assignedComunidades.size,
  };
}