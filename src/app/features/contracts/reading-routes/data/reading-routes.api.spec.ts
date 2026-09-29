import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReadingRoutesService } from './reading-routes.api';
import { environment } from '../../../../../environments/environment';
import { ICreateRouteAssignmentsDto } from '../domain/models/reading-route.model';

describe('ReadingRoutesService', () => {
  let service: ReadingRoutesService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ReadingRoutesService],
    });

    service = TestBed.inject(ReadingRoutesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('createAssignments should send POST to /routes/assignments and return created routes', () => {
    const dto: ICreateRouteAssignmentsDto = {
      periodoId: 1,
      operarioId: 5,
      comunidadId: 2,
      sectorIds: [10, 11],
      fechaPlanificada: '2026-06-15',
    };

    const mockResponse = [
      {
        rutaId: '101',
        nombre: 'Ruta 1',
        operarioId: 5,
        tipoRuta: 'LECTURA',
        comunidadId: 2,
        sectorId: 10,
        periodoId: 1,
        estado: 'PENDIENTE',
      },
    ];

    service.createAssignments(dto).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/routes/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockResponse);
  });

  it('getActivityTypes should send GET to /routes/activity-types and return activity types', () => {
    const mockTipos = [
      {
        tipoActividadId: 1,
        codigo: 'LECTURA',
        nombre: 'Lectura',
        activo: true,
      },
    ];

    service.getActivityTypes().subscribe((res) => {
      expect(res).toEqual(mockTipos);
    });

    const req = httpMock.expectOne(`${baseUrl}/routes/activity-types`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTipos);
  });
});
