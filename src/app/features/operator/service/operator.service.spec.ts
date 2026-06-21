import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { OperatorService } from './operator.service';
import type { TaskResponse, ReadingWithAnomaly } from '../models/operator.models';

const mockTask: TaskResponse = {
  rutaId: 'r-001',
  tipoRuta: 'TOMA_LECTURA',
  nombre: 'Ruta Norte',
  estado: 'PENDIENTE',
  orden: 1,
  operarioId: 1,
  comunidadId: 2,
  medidor: null,
  operario: { usuarioId: 1, nombres: 'Ana', apellidos: 'López' },
};

const mockAnomaly: ReadingWithAnomaly = {
  lecturaId: 'l-001',
  medidorSerie: 'SER-001',
  fecha: '2026-06-15T10:00:00Z',
  estado: 'PROCESADA',
  anomalias: [{ tipo: 'FUGA', observacion: 'Fuga detectada', estado: 'PENDIENTE' }],
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

  describe('getTasks', () => {
    it('calls GET /api/v1/operator/tasks and returns tasks array', () => {
      httpGetSpy.mockReturnValue(of([mockTask]));

      let result: TaskResponse[] = [];
      service.getTasks().subscribe((tasks) => (result = tasks));

      expect(httpGetSpy).toHaveBeenCalledOnce();
      const [url] = httpGetSpy.mock.calls[0] as [string, unknown];
      expect(url).toBe('/api/v1/operator/tasks');
      expect(result.length).toBe(1);
      expect(result[0].rutaId).toBe('r-001');
    });

    it('includes tipoRuta as HttpParams when provided', () => {
      httpGetSpy.mockReturnValue(of([mockTask]));

      service.getTasks('TOMA_LECTURA').subscribe();

      const [url, options] = httpGetSpy.mock.calls[0] as [string, { params: HttpParams }];
      expect(url).toBe('/api/v1/operator/tasks');
      expect(options?.params.get('tipoRuta')).toBe('TOMA_LECTURA');
    });
  });

  describe('updateTaskState', () => {
    it('calls PATCH /api/v1/operator/tasks/:id/state with the dto payload', () => {
      httpPatchSpy.mockReturnValue(of({ success: true }));

      let result: unknown;
      service.updateTaskState('r-001', { estado: 'COMPLETADA' }).subscribe((r) => (result = r));

      expect(httpPatchSpy).toHaveBeenCalledOnce();
      const [url, body] = httpPatchSpy.mock.calls[0] as [string, { estado: string }];
      expect(url).toBe('/api/v1/operator/tasks/r-001/state');
      expect(body).toEqual({ estado: 'COMPLETADA' });
      expect(result).toEqual({ success: true });
    });

    it('passes optional observacion field in the dto body', () => {
      httpPatchSpy.mockReturnValue(of({}));

      service
        .updateTaskState('r-002', { estado: 'CANCELADA', observacion: 'No llegué' })
        .subscribe();

      const [, body] = httpPatchSpy.mock.calls[0] as [
        string,
        { estado: string; observacion?: string },
      ];
      expect(body.observacion).toBe('No llegué');
      expect(body.estado).toBe('CANCELADA');
    });
  });

  describe('getReadingsWithAnomalies', () => {
    it('calls GET /api/v1/operator/readings/anomalies and returns readings', () => {
      httpGetSpy.mockReturnValue(of([mockAnomaly]));

      let result: ReadingWithAnomaly[] = [];
      service.getReadingsWithAnomalies().subscribe((r) => (result = r));

      const [url] = httpGetSpy.mock.calls[0] as [string];
      expect(url).toBe('/api/v1/operator/readings/anomalies');
      expect(result.length).toBe(1);
      expect(result[0].anomalias[0].tipo).toBe('FUGA');
    });

    it('returns empty array when backend responds with empty list', () => {
      httpGetSpy.mockReturnValue(of([]));

      let result: ReadingWithAnomaly[] = [mockAnomaly];
      service.getReadingsWithAnomalies().subscribe((r) => (result = r));

      expect(result.length).toBe(0);
    });
  });
});
