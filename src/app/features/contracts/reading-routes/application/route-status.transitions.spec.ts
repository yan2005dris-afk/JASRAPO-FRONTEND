import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { IReadingRoute } from '../domain/models/reading-route.model';
import { ReadingRoutesService } from '../data/reading-routes.api';
import { RouteStatusService } from './route-status.transitions';

describe('RouteStatusService', () => {
  let service: RouteStatusService;
  let routesService: { updateRoute: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let dialog: { confirm: ReturnType<typeof vi.fn> };

  const baseRoute: IReadingRoute = {
    rutaId: 12,
    nombre: 'Ruta 12',
    operarioId: 4,
    tipoRuta: 'LECTURA',
    comunidadId: 1,
    periodoId: 1,
    estado: 'EN_PROGRESO',
  };

  beforeEach(() => {
    routesService = { updateRoute: vi.fn() };
    toast = { success: vi.fn(), error: vi.fn() };
    dialog = { confirm: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: ReadingRoutesService, useValue: routesService },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmDialogService, useValue: dialog },
        RouteStatusService,
      ],
    });
    service = TestBed.inject(RouteStatusService);
  });

  function makeCtx(
    overrides: Partial<{
      route: IReadingRoute | null;
      isLecturaRoute: boolean;
      routeKpis: {
        total: number;
        completadas: number;
        pendientes: number;
        conNovedad: number;
        canceladas: number;
      } | null;
      pendingOrders: number;
    }> = {},
  ) {
    const route = signal<IReadingRoute | null>(overrides.route ?? baseRoute);
    const isChangingStatus = signal(false);
    return {
      route,
      isChangingStatus,
      isLecturaRoute: overrides.isLecturaRoute ?? true,
      routeKpis: overrides.routeKpis ?? {
        total: 10,
        completadas: 10,
        pendientes: 0,
        conNovedad: 0,
        canceladas: 0,
      },
      pendingOrders: overrides.pendingOrders ?? 0,
    };
  }

  it('updates the route status when the operator confirms and there are no pending items', async () => {
    dialog.confirm.mockReturnValue(of(true));
    routesService.updateRoute.mockReturnValue(of({ ...baseRoute, estado: 'COMPLETADA' }));
    const ctx = makeCtx();

    await service.update('COMPLETADA', ctx);

    // Only the main confirmation should be asked (no pending warning).
    expect(dialog.confirm).toHaveBeenCalledTimes(1);
    expect(routesService.updateRoute).toHaveBeenCalledWith(12, { estado: 'COMPLETADA' });
    expect(ctx.route()?.estado).toBe('COMPLETADA');
    expect(ctx.isChangingStatus()).toBe(false);
    expect(toast.success).toHaveBeenCalled();
  });

  it('warns before applying COMPLETADA when a lectura route still has unread readings', async () => {
    dialog.confirm.mockReturnValue(of(true));
    routesService.updateRoute.mockReturnValue(of({ ...baseRoute, estado: 'COMPLETADA' }));
    const ctx = makeCtx({
      isLecturaRoute: true,
      routeKpis: { total: 10, completadas: 7, pendientes: 3, conNovedad: 0, canceladas: 0 },
    });

    await service.update('COMPLETADA', ctx);

    // First the pending warning, then the transition confirmation.
    expect(dialog.confirm).toHaveBeenCalledTimes(2);
    expect(dialog.confirm.mock.calls[0][0].title).toBe('Ruta con lecturas pendientes');
    expect(dialog.confirm.mock.calls[0][0].isDanger).toBe(true);
  });

  it('warns before applying COMPLETADA when an ordenes route still has pending orders', async () => {
    dialog.confirm.mockReturnValue(of(true));
    routesService.updateRoute.mockReturnValue(of({ ...baseRoute, estado: 'COMPLETADA' }));
    const ctx = makeCtx({
      isLecturaRoute: false,
      pendingOrders: 4,
    });

    await service.update('COMPLETADA', ctx);

    expect(dialog.confirm.mock.calls[0][0].title).toBe('Ruta con órdenes pendientes');
  });

  it('does not call the API when the operator declines the transition', async () => {
    dialog.confirm.mockReturnValue(of(false));
    const ctx = makeCtx();

    await service.update('EN_PROGRESO', ctx);

    expect(routesService.updateRoute).not.toHaveBeenCalled();
  });

  it('marks the transition as danger when cancelling the route', async () => {
    dialog.confirm.mockReturnValue(of(true));
    routesService.updateRoute.mockReturnValue(of({ ...baseRoute, estado: 'CANCELADA' }));
    const ctx = makeCtx();

    await service.update('CANCELADA', ctx);

    expect(dialog.confirm.mock.calls[0][0].isDanger).toBe(true);
    expect(routesService.updateRoute).toHaveBeenCalledWith(12, { estado: 'CANCELADA' });
  });

  it('surfaces an error toast when the backend rejects the update', async () => {
    dialog.confirm.mockReturnValue(of(true));
    routesService.updateRoute.mockReturnValue(throwError(() => new Error('boom')));
    const ctx = makeCtx();

    await service.update('EN_PROGRESO', ctx);

    expect(toast.error).toHaveBeenCalledWith('No se pudo actualizar el estado de la ruta');
    expect(ctx.isChangingStatus()).toBe(false);
  });

  it('does nothing when the route signal is null', async () => {
    const route = signal<IReadingRoute | null>(null);
    const isChangingStatus = signal(false);
    const ctx = {
      route,
      isChangingStatus,
      isLecturaRoute: true,
      routeKpis: { total: 0, completadas: 0, pendientes: 0, conNovedad: 0, canceladas: 0 },
      pendingOrders: 0,
    };

    await service.update('EN_PROGRESO', ctx);

    expect(dialog.confirm).not.toHaveBeenCalled();
    expect(routesService.updateRoute).not.toHaveBeenCalled();
  });
});
