/**
 * Pure helpers over the User catalog. The assignment workspace, the route
 * list and the reassign modal all filter the same way — only users whose
 * `rol.nombre` contains 'operador' or 'operario' (case-insensitive).
 * Centralising here makes the rule auditable in one place.
 */

export interface UserWithRole {
  rol?: { nombre?: string | null } | null;
}

/**
 * Returns the subset of users that match the operator/operario role
 * pattern. Returns the input unchanged when the list is nullish or empty.
 * Comparison is case-insensitive; both Spanish variants ('operador',
 * 'operario') are accepted.
 */
export function filterOperariosByRole<T extends UserWithRole>(
  users: readonly T[] | null | undefined,
): T[] {
  if (!users || users.length === 0) return [];
  return users.filter((u) => {
    const roleName = (u.rol?.nombre ?? '').toLowerCase();
    return roleName.includes('operador') || roleName.includes('operario');
  });
}
