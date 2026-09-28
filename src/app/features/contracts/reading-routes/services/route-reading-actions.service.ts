import { Injectable, WritableSignal, inject } from '@angular/core';

import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { IReadingRowItem } from '../../readings/components/readings-table/readings-table.component';
import { ReadingRoutesService } from './reading-routes.service';

/**
 * Centralises the validation actions for a reading on a TOMA_LECTURA route.
 *
 * The previous inline implementation in reading-route-detail.component.ts
 * had the same shape repeated for approve / reject (close the dropdown,
 * PATCH, mutate the row in the local signal, surface a toast) and a stub for
 * re-reading requests that surfaced a TODO toast.
 *
 * The service keeps the optimistic update + toast pattern in one place and
 * makes the re-reading request a real confirmation flow instead of an
 * inline TODO. The backend endpoint is not wired yet — when it is, this is
 * the single place to update.
 */
@Injectable({ providedIn: 'root' })
export class RouteReadingActionsService {
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

  /** Marks the reading as APROBADA. Updates the row in the local signal. */
  approve(reading: IReadingRowItem, readings: WritableSignal<IReadingRowItem[]>): void {
    this.routesService.updateReadingStatus(reading.lecturaId, 'APROBADA').subscribe({
      next: () => {
        readings.update((list) =>
          list.map((r) => (r.lecturaId === reading.lecturaId ? { ...r, estado: 'APROBADA' } : r)),
        );
        this.toastService.success('Lectura aprobada');
      },
      error: () => this.toastService.error('Error al aprobar la lectura'),
    });
  }

  /** Marks the reading as RECHAZADA_VERIFICACION (verification queue). */
  reject(reading: IReadingRowItem, readings: WritableSignal<IReadingRowItem[]>): void {
    this.routesService.updateReadingStatus(reading.lecturaId, 'RECHAZADA_VERIFICACION').subscribe({
      next: () => {
        readings.update((list) =>
          list.map((r) =>
            r.lecturaId === reading.lecturaId ? { ...r, estado: 'RECHAZADA_VERIFICACION' } : r,
          ),
        );
        this.toastService.warning('Lectura rechazada');
      },
      error: () => this.toastService.error('Error al rechazar la lectura'),
    });
  }

  /**
   * Asks the operator to confirm a re-reading request for the meter on the
   * given reading. When the backend endpoint lands, only the body of this
   // method needs to change.
   */
  requestReReading(reading: IReadingRowItem): void {
    const meterLabel = reading.medidorSerie ?? reading.lecturaId;
    this.dialogService
      .confirm({
        title: 'Solicitar relectura',
        message: `¿Solicitar relectura para el medidor ${meterLabel}?`,
        confirmText: 'Sí, solicitar',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        // TODO: wire to backend when SC-XXX lands. Today this is an explicit
        // ack so the operator does not think the action went through.
        this.toastService.info('Solicitud de relectura aún no conectada al backend');
      });
  }
}
