import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { OrderWork } from '../interfaces/ireading-route.interface';
import { ReadingRoutesService } from '../data/reading-routes.api';
import { RouteOrderActionsService } from './route-order-actions.service';

describe('RouteOrderActionsService', () => {
  let service: RouteOrderActionsService;
  let routesService: { updateOrdenEstado: ReturnType<typeof vi.fn> };
  let toast: {
    success: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let dialog: { confirm: ReturnType<typeof vi.fn> };

  const sampleOrden: OrderWork = {
    ordenTrabajoId: 'OT-1',
    rutaId: 'R-1',
    tipoActividad: 'INSTALACION',
    estado: 'PENDIENTE',
    ordenVisita: 7,
    contrato: {
      numeroContrato: 'C-1',
      clienteNombre: 'Cliente Test',
      direccion: 'Calle 1',
    },
  };

  beforeEach(() => {
    routesService = { updateOrdenEstado: vi.fn() };
    toast = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };
    dialog = { confirm: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: ReadingRoutesService, useValue: routesService },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmDialogService, useValue: dialog },
        RouteOrderActionsService,
      ],
    });
    service = TestBed.inject(RouteOrderActionsService);
  });

  describe('start', () => {
    it('PATCHes the order to EN_PROGRESO and optimistically updates the orders signal', () => {
      routesService.updateOrdenEstado.mockReturnValue(of(undefined));
      const processingId = signal<string | null>(null);
      const ordenes = signal<OrderWork[]>([{ ...sampleOrden }]);

      service.start(sampleOrden, processingId, ordenes);

      expect(routesService.updateOrdenEstado).toHaveBeenCalledWith('OT-1', 'EN_PROGRESO');
      expect(ordenes()[0].estado).toBe('EN_PROGRESO');
      expect(processingId()).toBeNull();
      expect(toast.success).toHaveBeenCalledWith('Orden iniciada');
    });

    it('surfaces the backend error message when the PATCH fails', () => {
      routesService.updateOrdenEstado.mockReturnValue(
        throwError(() => ({ error: { message: 'operario no asignado' } })),
      );
      const processingId = signal<string | null>(null);
      const ordenes = signal<OrderWork[]>([{ ...sampleOrden }]);

      service.start(sampleOrden, processingId, ordenes);

      expect(processingId()).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('operario no asignado');
    });

    it('falls back to the default error message when the backend gives none', () => {
      routesService.updateOrdenEstado.mockReturnValue(throwError(() => ({})));
      const processingId = signal<string | null>(null);
      const ordenes = signal<OrderWork[]>([{ ...sampleOrden }]);

      service.start(sampleOrden, processingId, ordenes);

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('operario'));
    });
  });

  describe('complete', () => {
    it('asks for confirmation first and does not call the API when the operator cancels', () => {
      dialog.confirm.mockReturnValue(of(false));
      const processingId = signal<string | null>(null);
      const ordenes = signal<OrderWork[]>([{ ...sampleOrden, estado: 'EN_PROGRESO' }]);

      service.complete(sampleOrden, processingId, ordenes);

      expect(dialog.confirm).toHaveBeenCalled();
      expect(routesService.updateOrdenEstado).not.toHaveBeenCalled();
      expect(ordenes()[0].estado).toBe('EN_PROGRESO');
    });

    it('PATCHes to COMPLETADA, stamps completadoEn and signals success when confirmed', () => {
      dialog.confirm.mockReturnValue(of(true));
      routesService.updateOrdenEstado.mockReturnValue(of(undefined));
      const processingId = signal<string | null>(null);
      const ordenes = signal<OrderWork[]>([{ ...sampleOrden, estado: 'EN_PROGRESO' }]);

      service.complete(sampleOrden, processingId, ordenes);

      expect(routesService.updateOrdenEstado).toHaveBeenCalledWith('OT-1', 'COMPLETADA');
      expect(ordenes()[0].estado).toBe('COMPLETADA');
      expect(ordenes()[0].completadoEn).toBeTypeOf('string');
      expect(toast.success).toHaveBeenCalledWith('Orden marcada como completada');
    });
  });

  describe('reportNovedad', () => {
    it('refuses to call the API when the observation is empty', () => {
      const processingId = signal<string | null>(null);
      const ordenes = signal<OrderWork[]>([{ ...sampleOrden, estado: 'EN_PROGRESO' }]);

      service.reportNovedad(sampleOrden, '   ', processingId, ordenes);

      expect(routesService.updateOrdenEstado).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('obligatoria'));
    });

    it('PATCHes FALLIDA with the observation and stamps the result on the local row', () => {
      routesService.updateOrdenEstado.mockReturnValue(of(undefined));
      const processingId = signal<string | null>(null);
      const ordenes = signal<OrderWork[]>([{ ...sampleOrden, estado: 'EN_PROGRESO' }]);

      service.reportNovedad(sampleOrden, 'cliente ausente', processingId, ordenes);

      expect(routesService.updateOrdenEstado).toHaveBeenCalledWith(
        'OT-1',
        'FALLIDA',
        'cliente ausente',
      );
      expect(ordenes()[0].estado).toBe('FALLIDA');
      expect(ordenes()[0].resultadoObservacion).toBe('cliente ausente');
      expect(toast.warning).toHaveBeenCalledWith('Novedad reportada para la orden');
    });
  });
});
