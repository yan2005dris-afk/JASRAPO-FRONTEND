import { Injectable, WritableSignal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { IRouteKpis } from '../interfaces/ireading-route.interface';
import { ReadingRoutesService } from './reading-routes.service';

export type RouteEstado =
  | 'PENDIENTE'
  | 'EN_PROGRESO'
  | 'COMPLETADA'
  | 'PARCIAL'
  | 'CANCELADA';

/**
 * Owns the full status-transition flow for a `IReadingRoute`:
 *
 *  1. Decide whether the transition needs a warning confirmation (COMPLETADA
 *     with pending work).
 *  2. Ask the operator to confirm the change.
 *  3. PATCH the route on the backend.
 *  4. Update the local `readingRoute` signal with the response and surface
 *     a success/error toast.
 *
 * The component passes in the signals (no service-owned state). The pending
 * counts are computed by the caller because they need access to either the
 * readings KPIs or the orders list — both owned by the component.
 *
 * The dialog APIs are Promise-wrapped here so the caller can `await` the
 * confirmation in a single line instead of dealing with subscribe callbacks.
 */
@Injectable({ providedIn: 'root' })
export class RouteStatusService {
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

  async update(
    nuevoEstado: RouteEstado,
    ctx: {
      route: WritableSignal<IReadingRoute | null>;
      isChangingStatus: WritableSignal<boolean>;
      isLecturaRoute: boolean;
      routeKpis: IRouteKpis | null;
      pendingOrders: number;
    },
  ): Promise<void> {
    const route = ctx.route();
    if (!route) return;

    const pending = ctx.isLecturaRoute
      ? (ctx.routeKpis?.total ?? 0) - (ctx.routeKpis?.completadas ?? 0)
      : ctx.pendingOrders;

    if (nuevoEstado === 'COMPLETADA' && pending > 0) {
      const proceed = await this.confirmPendingCompletion(ctx.isLecturaRoute, pending);
      if (!proceed) return;
    }

    const confirmed = await this.confirmTransition(nuevoEstado);
    if (!confirmed) return;

    ctx.isChangingStatus.set(true);
    this.routesService.updateRoute(route.rutaId, { estado: nuevoEstado }).subscribe({
      next: (updated) => {
        ctx.route.set({ ...route, ...updated });
        ctx.isChangingStatus.set(false);
        this.toastService.success(`Ruta actualizada a ${updated.estado ?? nuevoEstado}`);
      },
      error: () => {
        ctx.isChangingStatus.set(false);
        this.toastService.error('No se pudo actualizar el estado de la ruta');
      },
    });
  }

  private async confirmPendingCompletion(
    isLecturaRoute: boolean,
    pending: number,
  ): Promise<boolean> {
    const message = isLecturaRoute
      ? `Atención: Existen ${pending} lecturas pendientes o en revisión. La ruta quedará marcada como PARCIAL. ¿Desea continuar?`
      : `Esta ruta tiene ${pending} órdenes pendientes. ¿Deseas completarla de todas formas?`;

    return firstValueFrom(
      this.dialogService.confirm({
        title: isLecturaRoute ? 'Ruta con lecturas pendientes' : 'Ruta con órdenes pendientes',
        message,
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
        isDanger: true,
      }),
    );
  }

  private async confirmTransition(nuevoEstado: RouteEstado): Promise<boolean> {
    return firstValueFrom(
      this.dialogService.confirm({
        title: 'Cambiar estado de ruta',
        message: `¿Estás seguro de cambiar el estado de la ruta a "${nuevoEstado}"?`,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        isDanger: nuevoEstado === 'CANCELADA',
      }),
    );
  }
}