import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ReadingRouteDetailComponent } from './reading-route-detail.component';

describe('ReadingRouteDetailComponent', () => {
  it('allows a PARCIAL route to resume as EN_PROGRESO via RouteStatusService', async () => {
    const component = Object.create(
      ReadingRouteDetailComponent.prototype,
    ) as ReadingRouteDetailComponent;
    const update = vi.fn().mockResolvedValue(undefined);
    Object.assign(component as object, {
      readingRoute: signal({
        rutaId: 12,
        nombre: 'Route 12',
        operarioId: 4,
        tipoRuta: 'LECTURA',
        comunidadId: 1,
        periodoId: 1,
        estado: 'PARCIAL',
      }),
      isChangingStatus: signal(false),
      isLecturaRoute: signal(true),
      routeKpis: signal({
        total: 10,
        completadas: 10,
        pendientes: 0,
        conNovedad: 0,
        canceladas: 0,
      }),
      ordenes: signal([]),
      routeStatus: { update },
    });

    await component.updateRouteStatus('EN_PROGRESO');

    expect(update).toHaveBeenCalledWith(
      'EN_PROGRESO',
      expect.objectContaining({ isLecturaRoute: true }),
    );
  });

  it('asks the order actions service to start an order', () => {
    const component = Object.create(
      ReadingRouteDetailComponent.prototype,
    ) as ReadingRouteDetailComponent;
    const start = vi.fn();
    Object.assign(component as object, {
      processingOrdenId: signal<string | null>(null),
      ordenes: signal([]),
      orderActions: { start, complete: vi.fn(), reportNovedad: vi.fn() },
    });
    const orden = {
      ordenTrabajoId: 'OT-1',
      rutaId: 'R-1',
      tipoActividad: 'INSTALACION',
      estado: 'PENDIENTE',
      ordenVisita: 1,
      contrato: { numeroContrato: 'C-1', clienteNombre: 'C', direccion: 'D' },
    } as never;

    component.iniciarOrden(orden);

    expect(start).toHaveBeenCalledWith(orden, component.processingOrdenId, component.ordenes);
  });
});
