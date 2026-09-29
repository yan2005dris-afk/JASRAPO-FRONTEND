import { describe, expect, it, vi } from 'vitest';
import { assertOperatorSelected, assertPeriodOpen } from './period.validator';
import { IAccountingPeriod } from '../../../../../shared/services/periods.service';

describe('route-assignment-validators', () => {
  describe('assertPeriodOpen', () => {
    it('returns true when the period is in ABIERTO state', () => {
      const toast = { show: vi.fn() };
      const period = {
        estado: 'ABIERTO',
        periodoId: 1,
        nombre: 'Octubre 2026',
      } as IAccountingPeriod;

      expect(assertPeriodOpen(period, toast as never)).toBe(true);
      expect(toast.show).not.toHaveBeenCalled();
    });

    it('returns false and fires the default warning when the period is missing', () => {
      const toast = { show: vi.fn() };

      expect(assertPeriodOpen(null, toast as never)).toBe(false);
      expect(toast.show).toHaveBeenCalledWith(
        expect.stringContaining('período operativo no está abierto'),
        'warning',
      );
    });

    it('returns false and fires the default warning when the period is not ABIERTO', () => {
      const toast = { show: vi.fn() };
      const period = { estado: 'CERRADO', periodoId: 1 } as IAccountingPeriod;

      expect(assertPeriodOpen(period, toast as never)).toBe(false);
      expect(toast.show).toHaveBeenCalledWith(expect.any(String), 'warning');
    });

    it('uses the caller-provided message and severity when supplied', () => {
      const toast = { show: vi.fn() };

      assertPeriodOpen(null, toast as never, {
        message: 'Solo se pueden planificar y despachar rutas para un período abierto.',
        severity: 'error',
      });

      expect(toast.show).toHaveBeenCalledWith(
        'Solo se pueden planificar y despachar rutas para un período abierto.',
        'error',
      );
    });
  });

  describe('assertOperatorSelected', () => {
    it('returns true when an operator id is selected', () => {
      const toast = { show: vi.fn() };

      expect(assertOperatorSelected(7, toast as never)).toBe(true);
      expect(toast.show).not.toHaveBeenCalled();
    });

    it('returns false and fires the default warning when the operator id is null', () => {
      const toast = { show: vi.fn() };

      expect(assertOperatorSelected(null, toast as never)).toBe(false);
      expect(toast.show).toHaveBeenCalledWith(
        expect.stringContaining('seleccioná un operario'),
        'warning',
      );
    });

    it('returns false and fires the default warning when the operator id is undefined', () => {
      const toast = { show: vi.fn() };

      expect(assertOperatorSelected(undefined, toast as never)).toBe(false);
      expect(toast.show).toHaveBeenCalled();
    });

    it('uses the caller-provided message for the toggle-sector variant', () => {
      const toast = { show: vi.fn() };

      assertOperatorSelected(null, toast as never, {
        message: 'Por favor, seleccioná un operario en la Tabla 1 para asignarle sectores.',
      });

      expect(toast.show).toHaveBeenCalledWith(
        'Por favor, seleccioná un operario en la Tabla 1 para asignarle sectores.',
        'warning',
      );
    });
  });
});
