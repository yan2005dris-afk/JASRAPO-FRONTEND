import { describe, expect, it } from 'vitest';
import { filterOperariosByRole } from './users.helpers';

describe('filterOperariosByRole', () => {
  it('keeps users whose role name contains "operador" or "operario" (case-insensitive)', () => {
    const users = [
      { usuarioId: 1, rol: { nombre: 'Operador' } },
      { usuarioId: 2, rol: { nombre: 'Operario' } },
      { usuarioId: 3, rol: { nombre: 'OPERARIO' } },
      { usuarioId: 4, rol: { nombre: 'Administrador' } },
      { usuarioId: 5, rol: { nombre: 'Operador de Campo' } },
    ];

    const result = filterOperariosByRole(users);

    expect(result.map((u) => u.usuarioId)).toEqual([1, 2, 3, 5]);
  });

  it('returns an empty array for a nullish or empty input', () => {
    expect(filterOperariosByRole(null)).toEqual([]);
    expect(filterOperariosByRole(undefined)).toEqual([]);
    expect(filterOperariosByRole([])).toEqual([]);
  });

  it('drops users whose rol is missing or has no nombre', () => {
    const users = [
      { usuarioId: 1, rol: null },
      { usuarioId: 2, rol: undefined },
      { usuarioId: 3, rol: {} },
      { usuarioId: 4, rol: { nombre: 'Operador' } },
    ];

    const result = filterOperariosByRole(users);

    expect(result.map((u) => u.usuarioId)).toEqual([4]);
  });
});
