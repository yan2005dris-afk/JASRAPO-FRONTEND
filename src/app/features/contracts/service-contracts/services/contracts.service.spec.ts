import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContractsService } from './contracts.service';
import type { ISearchContractsParams } from '../interfaces/icontract.interface';

describe('ContractsService', () => {
  let service: ContractsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContractsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContractsService);
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
});
