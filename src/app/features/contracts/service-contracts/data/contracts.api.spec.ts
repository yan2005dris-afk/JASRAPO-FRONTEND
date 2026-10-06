import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContractsApi } from './contracts.api';
import type { ISearchContractsParams } from '../domain/models/service-contract.model';

describe('ContractsApi', () => {
  let service: ContractsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContractsApi, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContractsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends a routeId when assigning to an existing route', () => {
    service.assignInstallationRoute('contract-1', { routeId: 42 }).subscribe();

    const request = http.expectOne((req) =>
      req.url.includes('/contracts/contract-1/assign-installation-route'),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ routeId: 42 });
    request.flush({ rutaId: 42 });
  });

  it('sends only the planned date when creating a route', () => {
    service.assignInstallationRoute('contract-1', { fechaPlanificada: '2026-09-20' }).subscribe();

    const request = http.expectOne((req) =>
      req.url.includes('/contracts/contract-1/assign-installation-route'),
    );
    expect(request.request.body).toEqual({ fechaPlanificada: '2026-09-20' });
    request.flush({ rutaId: 43 });
  });

  it('serializes separated contract status filters', () => {
    const params: ISearchContractsParams = {
      estadoServicio: 'ACTIVO',
      estadoCobranza: 'EN_MORA',
    };

    service.getContracts(params).subscribe();

    const request = http.expectOne((req) => req.url.endsWith('/contracts'));
    expect(request.request.params.get('estadoServicio')).toBe('ACTIVO');
    expect(request.request.params.get('estadoCobranza')).toBe('EN_MORA');
    expect(request.request.params.has('estado')).toBe(false);
    request.flush({ data: [], meta: { total: 0 } });
  });

  it('serializes global contract search', () => {
    service.getContracts({ search: 'tarifa residencial' }).subscribe();

    const request = http.expectOne((req) => req.url.endsWith('/contracts'));
    expect(request.request.params.get('search')).toBe('tarifa residencial');
    expect(request.request.params.has('numeroGuia')).toBe(false);
    expect(request.request.params.has('medidorSerie')).toBe(false);
    expect(request.request.params.has('ubicacion')).toBe(false);
    request.flush({ data: [], meta: { total: 0 } });
  });

  it('serializes only the service state filter when selected independently', () => {
    service.getContracts({ estadoServicio: 'ACTIVO' }).subscribe();

    const request = http.expectOne((req) => req.url.endsWith('/contracts'));
    expect(request.request.params.get('estadoServicio')).toBe('ACTIVO');
    expect(request.request.params.has('estadoCobranza')).toBe(false);
    expect(request.request.params.has('estado')).toBe(false);
    request.flush({ data: [], meta: { total: 0 } });
  });

  it('serializes only the collection state filter when selected independently', () => {
    service.getContracts({ estadoCobranza: 'AL_DIA' }).subscribe();

    const request = http.expectOne((req) => req.url.endsWith('/contracts'));
    expect(request.request.params.get('estadoCobranza')).toBe('AL_DIA');
    expect(request.request.params.has('estadoServicio')).toBe(false);
    expect(request.request.params.has('estado')).toBe(false);
    request.flush({ data: [], meta: { total: 0 } });
  });

  it('requests the service area', () => {
    const area = {
      nombre: 'Parroquia Manglaralto',
      fuente: 'OpenStreetMap (relation 278708), ODbL',
      geometria: { type: 'Polygon', coordinates: [[[-80.78, -1.83]]] },
    };
    let received: unknown;

    service.getServiceArea().subscribe((value) => (received = value));
    const request = http.expectOne((req) => req.url.endsWith('/contracts/service-area'));
    expect(request.request.method).toBe('GET');
    request.flush(area);

    expect(received).toEqual(area);
  });
});
