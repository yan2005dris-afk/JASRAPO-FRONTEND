/**
 * Pure session-assignment helpers for the route-assignment workspace.
 *
 * Centralises the three repeated patterns that lived inline in
 * route-assignment-workspace.component.ts:
 *
 *   1. Toggle an in-session assignment (assign / deselect / block by DB or
 *      another operator). The caller receives a discriminated union
 *      describing the outcome and decides what toast to show.
 *
 *   2. Clear every assignment owned by a given operator from a session map.
 *      The workspace has two such maps (sectors + whole communities) plus
 *      a third for contracts; the logic is identical for all three.
 *
 *   3. Group in-session assignments by operator and community, the shape
 *      needed to build the ICreateRouteAssignmentsDto[] payload for the
 *      batch dispatch endpoint.
 *
 * Everything here is pure: no DI, no signals, no side effects. The
 * component owns the source Maps and updates them with the returned
 * `next` Maps.
 */

export interface AssignmentStatus {
  /** True when the assignment already exists in the database (terminal). */
  isDbAssigned: boolean;
  /** Operator id currently assigned in session, if any. */
  assignedOperatorId?: number;
}

export type ToggleAssignmentOutcome<K> =
  | { kind: 'assigned'; next: Map<K, number> }
  | { kind: 'deselected'; next: Map<K, number> }
  | { kind: 'blocked-by-db' }
  | { kind: 'blocked-by-other-operator'; existingOperatorId: number };

/**
 * Toggle an in-session assignment. Returns a new Map (the input is never
 * mutated) and a discriminated outcome. The caller decides what toast to
 * show based on `kind`.
 *
 * Order of checks mirrors the original component logic:
 *   1. DB-assigned entries are terminal — no session mutation, no change.
 *   2. Session entry owned by the current operator → deselect (delete).
 *   3. Session entry owned by a different operator → block (no mutation).
 *   4. Free → assign to the current operator.
 */
export function toggleAssignment<K>(
  currentMap: ReadonlyMap<K, number>,
  key: K,
  currentOperatorId: number,
  status: AssignmentStatus,
): ToggleAssignmentOutcome<K> {
  if (status.isDbAssigned) {
    return { kind: 'blocked-by-db' };
  }

  const next = new Map(currentMap);
  const existingOpId = status.assignedOperatorId;

  if (existingOpId === currentOperatorId) {
    next.delete(key);
    return { kind: 'deselected', next };
  }

  if (existingOpId != null && existingOpId !== currentOperatorId) {
    return { kind: 'blocked-by-other-operator', existingOperatorId: existingOpId };
  }

  next.set(key, currentOperatorId);
  return { kind: 'assigned', next };
}

/**
 * Returns a new Map with every entry whose operator equals `operatorId`
 * removed. Used by both `clearOperatorSessionAssignments` (sectors +
 * communities) and `clearOperatorContractAssignments`.
 */
export function clearAssignmentsForOperator<K>(
  source: ReadonlyMap<K, number>,
  operatorId: number,
): Map<K, number> {
  const result = new Map(source);
  result.forEach((opId, key) => {
    if (opId === operatorId) {
      result.delete(key);
    }
  });
  return result;
}

/**
 * Group sector-session assignments by operator -> community -> sectorIds[].
 *
 * Output shape:
 *   Map<operarioId, Map<comunidadId, sectorIds[]>>
 *
 * Sectors that no longer exist in the catalog are silently dropped (the
 * original component's inline loop did the same: it could not resolve the
 * sector and just `return`-ed).
 */
export function groupSectorAssignmentsByOperatorCommunity<
  S extends { sectorId: number; comunidadId: number },
>(
  assignments: ReadonlyMap<number, number>,
  sectores: ReadonlyArray<S>,
): Map<number, Map<number, number[]>> {
  const byOperator = new Map<number, Map<number, number[]>>();
  const sectorById = new Map<number, S>();
  for (const s of sectores) {
    sectorById.set(s.sectorId, s);
  }

  assignments.forEach((operatorId, sectorId) => {
    const sector = sectorById.get(sectorId);
    if (!sector) return;

    let byCommunity = byOperator.get(operatorId);
    if (!byCommunity) {
      byCommunity = new Map();
      byOperator.set(operatorId, byCommunity);
    }
    const list = byCommunity.get(sector.comunidadId) ?? [];
    list.push(sectorId);
    byCommunity.set(sector.comunidadId, list);
  });

  return byOperator;
}

/**
 * Group contract-session assignments by operator -> community -> contratoIds[].
 *
 * Same output shape as `groupSectorAssignmentsByOperatorCommunity` but the
 * lookup uses `contratoId` (which can be string or number on the wire) and
 * `comunidadId` from the IContract.
 */
export function groupContractAssignmentsByOperatorCommunity<
  C extends { contratoId: string | number; comunidadId: number },
>(
  assignments: ReadonlyMap<number, number>,
  contracts: ReadonlyArray<C>,
): Map<number, Map<number, number[]>> {
  const byOperator = new Map<number, Map<number, number[]>>();
  const contractById = new Map<number, C>();
  for (const c of contracts) {
    contractById.set(Number(c.contratoId), c);
  }

  assignments.forEach((operatorId, contratoId) => {
    const contract = contractById.get(contratoId);
    if (!contract) return;

    let byCommunity = byOperator.get(operatorId);
    if (!byCommunity) {
      byCommunity = new Map();
      byOperator.set(operatorId, byCommunity);
    }
    const list = byCommunity.get(contract.comunidadId) ?? [];
    list.push(contratoId);
    byCommunity.set(contract.comunidadId, list);
  });

  return byOperator;
}