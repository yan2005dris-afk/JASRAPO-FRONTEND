import { describe, expect, it } from 'vitest';
import { resolveComunidadNombre, resolveOperarioNombre } from './operator-name';

describe('operator-name.helpers', () => {
  describe('resolveOperarioNombre', () => {
    const operarios = [
      { usuarioId: 1, nombres: 'Ana', apellidos: 'Pérez' },
      { usuarioId: 2, nombres: 'Luis', apellidos: 'Gómez' },
    ];

    it('formats the namespaced full name when the operator is in the catalog', () => {
      expect(resolveOperarioNombre(operarios, 1)).toBe('Ana Pérez');
    });

    it('returns "Sin asignar" when the operator id is null or undefined', () => {
      expect(resolveOperarioNombre(operarios, null)).toBe('Sin asignar');
      expect(resolveOperarioNombre(operarios, undefined)).toBe('Sin asignar');
    });

    it('returns the default "Operario #<id>" fallback when the id is missing from the catalog', () => {
      expect(resolveOperarioNombre(operarios, 99)).toBe('Operario #99');
    });

    it('returns the caller-provided fallback when supplied', () => {
      expect(resolveOperarioNombre(operarios, 99, (id) => `custom-${id}`)).toBe('custom-99');
    });

    it('handles an empty / nullish catalog gracefully', () => {
      expect(resolveOperarioNombre([], 5)).toBe('Operario #5');
      expect(resolveOperarioNombre(null, 5)).toBe('Operario #5');
      expect(resolveOperarioNombre(undefined, 5)).toBe('Operario #5');
    });
  });

  describe('resolveComunidadNombre', () => {
    const comunidades = [
      { id: 1, nombre: 'Comunidad Norte' },
      { id: 2, nombre: 'Comunidad Sur' },
    ];

    it('returns the community name when the id is in the catalog', () => {
      expect(resolveComunidadNombre(comunidades, 2)).toBe('Comunidad Sur');
    });

    it('returns an em-dash when the id is null or undefined', () => {
      expect(resolveComunidadNombre(comunidades, null)).toBe('—');
      expect(resolveComunidadNombre(comunidades, undefined)).toBe('—');
    });

    it('returns "Comunidad #<id>" when the id is missing from the catalog', () => {
      expect(resolveComunidadNombre(comunidades, 99)).toBe('Comunidad #99');
    });

    it('returns the caller-provided fallback when supplied', () => {
      expect(resolveComunidadNombre(comunidades, 99, (id) => `fallback-${id}`)).toBe('fallback-99');
    });
  });
});
