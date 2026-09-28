import { Injectable, WritableSignal, inject } from '@angular/core';

import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { OrderWork } from '../interfaces/ireading-route.interface';
import { ReadingRoutesService } from './reading-routes.service';

/**
 * Centralises every state-changing action on a work order of a route.
 *
 * Previously this logic lived inline in `reading-route-detail.component.ts`,
 * duplicated three times (start / complete / report novelty) with the same
 * shape: set processing → PATCH → optimistic-update signal → toast.
 *
 * The service keeps the side effects scoped:
 *  - HTTP call to `ReadingRoutesService`
 *  - Optimistic local update of the orders signal (so the row reflects the
 *    new state without a round-trip)
 *  - Toast feedback (success / warning / error)
 *  - Confirmation dialog when the action is destructive or consequential
 *    (complete, report novelty)
 *
 * The component keeps the signal ownership (`ordenes`, `processingOrdenId`)
 * and passes them in. The service never owns state — that keeps it cheap to
 * instantiate per page and easy to test.
 */
@Injectable({ providedIn: 'root' })
export class RouteOrderActionsService {
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

  /**
   * PENDIENTE → EN_PROGRESO. Does not require a confirmation dialog because
   * it is reversible (the operator can mark complete or report novelty next).
   * Applies the new state to the local orders signal so the row reflects it
   * immediately, then surfaces success/error through the toast service.
   */
  start(
    orden: OrderWork,
    processingId: WritableSignal<string | null>,
    ordenes: WritableSignal<OrderWork[]>,
  ): void {
    processingId.set(orden.ordenTrabajoId);

    this.routesService.updateOrdenEstado(orden.ordenTrabajoId, 'EN_PROGRESO').subscribe({
      next: () => {
        ordenes.update((list) =>
          list.map((o) =>
            o.ordenTrabajoId === orden.ordenTrabajoId
              ? { ...o, estado: 'EN_PROGRESO' as const }
              : o,
          ),
        );
        processingId.set(null);
        this.toastService.success('Orden iniciada');
      },
      error: (err) => {
        processingId.set(null);
        this.toastService.error(this.extractMessage(err) || this.defaultStartError());
      },
    });
  }

  /**
   * EN_PROGRESO → COMPLETADA. Confirms with the operator first because the
   * state is terminal in practice (re-opening requires an admin).
   *
   * We also stamp `completadoEn` locally with the current timestamp so the
   * table shows the date immediately, even before the backend response
   * arrives on a follow-up read. The next reload will overwrite it with the
   * authoritative server timestamp — this is a deliberate trade-off in
   * favour of perceived responsiveness.
   */
  complete(
    orden: OrderWork,
    processingId: WritableSignal<string | null>,
    ordenes: WritableSignal<OrderWork[]>,
  ): void {
    this.dialogService
      .confirm({
        title: 'Marcar como completada',
        message: `¿Deseas marcar como completada la orden #${orden.ordenVisita} para el contrato ${orden.contrato.numeroContrato}?`,
        confirmText: 'Sí, completar',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        processingId.set(orden.ordenTrabajoId);

        this.routesService.updateOrdenEstado(orden.ordenTrabajoId, 'COMPLETADA').subscribe({
          next: () => {
            ordenes.update((list) =>
              list.map((o) =>
                o.ordenTrabajoId === orden.ordenTrabajoId
                  ? {
                      ...o,
                      estado: 'COMPLETADA' as const,
                      completadoEn: new Date().toISOString(),
                    }
                  : o,
              ),
            );
            processingId.set(null);
            this.toastService.success('Orden marcada como completada');
          },
          error: () => {
            processingId.set(null);
            this.toastService.error('Error al completar la orden');
          },
        });
      });
  }

  /**
   * EN_PROGRESO → FALLIDA with a free-text observation. The observation is
   * mandatory — the caller (component) is expected to gate the submit
   * button on a non-empty trimmed string. We re-check here defensively to
   * avoid a silent 4xx from the backend.
   */
  reportNovedad(
    orden: OrderWork,
    observacion: string,
    processingId: WritableSignal<string | null>,
    ordenes: WritableSignal<OrderWork[]>,
  ): void {
    const trimmed = observacion.trim();
    if (!trimmed) {
      this.toastService.error('La observación es obligatoria para reportar una novedad');
      return;
    }

    processingId.set(orden.ordenTrabajoId);

    this.routesService.updateOrdenEstado(orden.ordenTrabajoId, 'FALLIDA', trimmed).subscribe({
      next: () => {
        ordenes.update((list) =>
          list.map((o) =>
            o.ordenTrabajoId === orden.ordenTrabajoId
              ? { ...o, estado: 'FALLIDA' as const, resultadoObservacion: trimmed }
              : o,
          ),
        );
        processingId.set(null);
        this.toastService.warning('Novedad reportada para la orden');
      },
      error: () => {
        processingId.set(null);
        this.toastService.error('Error al reportar la novedad');
      },
    });
  }

  private extractMessage(err: unknown): string | null {
    const message = (err as { error?: { message?: string | string[] } })?.error?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? null;
  }

  private defaultStartError(): string {
    return 'No puedes iniciar esta operación porque no estás asignado como operario a esta orden de trabajo.';
  }
}