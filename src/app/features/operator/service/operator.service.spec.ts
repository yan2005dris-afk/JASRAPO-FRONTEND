import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { OperatorService } from './operator.service';
import type { OperatorRouteResponse } from '../domain/models/operator.models';

const mockTask: OperatorRouteResponse = {
  rutaId: 'r-001',
  tipoRuta: 'LECTURA',
  nombre: 'Ruta Norte',
  estado: 'PENDIENTE',
  operarioId: 1,
  comunidadId: 2,
  medidor: null,
  operario: { usuarioId: 1, nombres: 'Ana', apellidos: 'López' },
};

describe('OperatorService', () => {
  let service: OperatorService;
  let httpGetSpy: ReturnType<typeof vi.fn>;
  let httpPatchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    httpGetSpy = vi.fn();
    httpPatchSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        OperatorService,
        { provide: HttpClient, useValue: { get: httpGetSpy, patch: httpPatchSpy } },
      ],
    });

    service = TestBed.inject(OperatorService);
  });

  describe('getRoutes', () => {
    it('calls GET /api/v1/operator/routes and returns routes array', () => {
      httpGetSpy.mockReturnValue(of([mockTask]));

      let result: OperatorRouteResponse[] = [];
      service.getRoutes().subscribe((routes) => (result = routes));

      expect(httpGetSpy).toHaveBeenCalledOnce();
      const [url] = httpGetSpy.mock.calls[0] as [string, unknown];
      expect(url).toBe('/api/v1/operator/routes');
      expect(result.length).toBe(1);
      expect(result[0].rutaId).toBe('r-001');
    });

    it('includes tipoRuta as HttpParams when provided', () => {
      httpGetSpy.mockReturnValue(of([mockTask]));

      service.getRoutes('LECTURA').subscribe();

      const [url, options] = httpGetSpy.mock.calls[0] as [string, { params: HttpParams }];
      expect(url).toBe('/api/v1/operator/routes');
      expect(options?.params.get('tipoRuta')).toBe('LECTURA');
    });
  });

  describe('updateRouteState', () => {
    it('calls PATCH /api/v1/operator/routes/:id/state with the dto payload', () => {
      httpPatchSpy.mockReturnValue(of({ success: true }));

      let result: unknown;
      service.updateRouteState('r-001', { estado: 'COMPLETADA' }).subscribe((r) => (result = r));

      expect(httpPatchSpy).toHaveBeenCalledOnce();
      const [url, body] = httpPatchSpy.mock.calls[0] as [string, { estado: string }];
      expect(url).toBe('/api/v1/operator/routes/r-001/state');
      expect(body).toEqual({ estado: 'COMPLETADA' });
      expect(result).toEqual({ success: true });
    });

    it('passes optional observacion field in the dto body', () => {
      httpPatchSpy.mockReturnValue(of({}));

      service
        .updateRouteState('r-002', { estado: 'CANCELADA', observacion: 'No llegué' })
        .subscribe();

      const [, body] = httpPatchSpy.mock.calls[0] as [
        string,
        { estado: string; observacion?: string },
      ];
      expect(body.observacion).toBe('No llegué');
      expect(body.estado).toBe('CANCELADA');
    });
  });
});
