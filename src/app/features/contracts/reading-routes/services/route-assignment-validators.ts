import { IAccountingPeriod } from '../../../../shared/services/periods.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';

/**
 * Pure validation helpers for the route-assignment workspace.
 *
 * The original component repeated six near-identical "is the period open?"
 * blocks and six near-identical "is there an operator selected?" blocks.
 * Each of one block also fired a toast with copy that diverged subtly from
 * site to site — this module centralises the logic and forces the caller
 * to opt into a message variant so the divergence is visible at the call
 * site instead of being hidden in 12 separate strings.
 */

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface AssertPeriodOpenOptions {
  /** Toast message when the period is closed or missing. */
  message?: string;
  /** Toast severity. Defaults to 'warning'. */
  severity?: ToastSeverity;
}

const DEFAULT_PERIOD_MESSAGE =
  'El período operativo no está abierto. No se pueden realizar asignaciones.';

/**
 * Returns `true` when the period exists and is in `ABIERTO` state. Otherwise
 * fires a toast via the injected ToastService and returns `false`. The
 * caller is expected to short-circuit on `false`.
 */
export function assertPeriodOpen(
  period: IAccountingPeriod | null | undefined,
  toast: ToastService,
  opts: AssertPeriodOpenOptions = {},
): boolean {
  if (period && period.estado === 'ABIERTO') {
    return true;
  }

  toast.show(opts.message ?? DEFAULT_PERIOD_MESSAGE, opts.severity ?? 'warning');
  return false;
}

export interface AssertOperatorSelectedOptions {
  message?: string;
  severity?: ToastSeverity;
}

const DEFAULT_OPERATOR_MESSAGE = 'Por favor, seleccioná un operario en la Tabla 1 primero.';

/**
 * Returns `true` when `operatorId` is non-null. Otherwise fires a toast
 * and returns `false`.
 */
export function assertOperatorSelected(
  operatorId: number | null | undefined,
  toast: ToastService,
  opts: AssertOperatorSelectedOptions = {},
): boolean {
  if (operatorId != null) {
    return true;
  }

  toast.show(opts.message ?? DEFAULT_OPERATOR_MESSAGE, opts.severity ?? 'warning');
  return false;
}
