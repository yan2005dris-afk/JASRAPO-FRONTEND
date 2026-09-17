import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ReadingRouteDetailComponent } from './reading-route-detail.component';

describe('ReadingRouteDetailComponent', () => {
  it('allows a PARCIAL route to resume as EN_PROGRESO', async () => {
    const component = Object.create(
      ReadingRouteDetailComponent.prototype,
    ) as ReadingRouteDetailComponent;
    const updateRoute = vi.fn().mockReturnValue(of({ estado: 'EN_PROGRESO' }));
    Object.assign(component as object, {
      readingRoute: signal({
        rutaId: 12,
        nombre: 'Route 12',
        operarioId: 4,
        tipoRuta: 'TOMA_LECTURA',
        comunidadId: 1,
        periodoId: 1,
        estado: 'PARCIAL',
      }),
      isChangingStatus: signal(false),
      dialogService: { confirm: vi.fn().mockReturnValue(of(true)) },
      routesService: { updateRoute },
      isLecturaRoute: signal(true),
      toastService: { success: vi.fn() },
    });

    await component.updateRouteStatus('EN_PROGRESO');

    expect(updateRoute).toHaveBeenCalledWith(12, { estado: 'EN_PROGRESO' });
  });
});
