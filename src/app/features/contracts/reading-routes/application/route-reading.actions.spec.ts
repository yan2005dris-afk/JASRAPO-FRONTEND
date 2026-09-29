import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { IReadingRowItem } from '../../readings/components/readings-table/readings-table.component';
import { ReadingRoutesService } from '../data/reading-routes.api';
import { RouteReadingActionsService } from './route-reading.actions';

describe('RouteReadingActionsService', () => {
  let service: RouteReadingActionsService;
  let routesService: { updateReadingStatus: ReturnType<typeof vi.fn> };
  let toast: {
    success: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };
  let dialog: { confirm: ReturnType<typeof vi.fn> };

  const sample: IReadingRowItem = {
    lecturaId: 'L-1',
    guia: 'G-1',
    clienteNombre: 'Cliente',
    direccion: 'Calle 1',
    estado: 'POR_REVISION',
    medidorSerie: 'M-1',
  };

  beforeEach(() => {
    routesService = { updateReadingStatus: vi.fn() };
    toast = { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() };
    dialog = { confirm: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: ReadingRoutesService, useValue: routesService },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmDialogService, useValue: dialog },
        RouteReadingActionsService,
      ],
    });
    service = TestBed.inject(RouteReadingActionsService);
  });

  it('approve PATCHes APROBADA and updates the row state on success', () => {
    routesService.updateReadingStatus.mockReturnValue(of(undefined));
    const readings = signal<IReadingRowItem[]>([{ ...sample }]);

    service.approve(sample, readings);

    expect(routesService.updateReadingStatus).toHaveBeenCalledWith('L-1', 'APROBADA');
    expect(readings()[0].estado).toBe('APROBADA');
    expect(toast.success).toHaveBeenCalledWith('Lectura aprobada');
  });

  it('approve surfaces an error toast when the backend rejects', () => {
    routesService.updateReadingStatus.mockReturnValue(throwError(() => new Error('boom')));
    const readings = signal<IReadingRowItem[]>([{ ...sample }]);

    service.approve(sample, readings);

    expect(toast.error).toHaveBeenCalledWith('Error al aprobar la lectura');
    expect(readings()[0].estado).toBe('POR_REVISION');
  });

  it('reject PATCHes RECHAZADA_VERIFICACION and warns', () => {
    routesService.updateReadingStatus.mockReturnValue(of(undefined));
    const readings = signal<IReadingRowItem[]>([{ ...sample }]);

    service.reject(sample, readings);

    expect(routesService.updateReadingStatus).toHaveBeenCalledWith('L-1', 'RECHAZADA_VERIFICACION');
    expect(readings()[0].estado).toBe('RECHAZADA_VERIFICACION');
    expect(toast.warning).toHaveBeenCalledWith('Lectura rechazada');
  });

  it('requestReReading asks for confirmation and shows an info toast today', () => {
    dialog.confirm.mockReturnValue(of(true));

    service.requestReReading(sample);

    expect(dialog.confirm).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('relectura'));
  });

  it('requestReReading does not toast when the operator cancels', () => {
    dialog.confirm.mockReturnValue(of(false));

    service.requestReReading(sample);

    expect(toast.info).not.toHaveBeenCalled();
  });
});
