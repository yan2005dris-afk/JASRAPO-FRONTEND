import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TariffsApi } from './tariffs.api';
import { environment } from '../../../../../environments/environment';

describe('TariffsApi', () => {
  let service: TariffsApi;
  let httpMock: HttpTestingController;

  const endpoint = `${environment.apiUrl}/tariff-categories`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TariffsApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('devuelve la respuesta paginada completa, no solo los datos', () => {
    const body = { data: [{ categoriaTarifaId: 1 }], meta: { total: 7, page: 1, limit: 10 } };
    let received: unknown;

    service.getTariffs().subscribe((res) => (received = res));

    httpMock.expectOne((r) => r.url === endpoint).flush(body);

    expect(received).toEqual(body);
  });

  it('envía page, limit y search cuando se proveen', () => {
    service.getTariffs({ page: 2, limit: 15, search: 'residencial' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === endpoint);

    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('15');
    expect(req.request.params.get('search')).toBe('residencial');

    req.flush({ data: [] });
  });

  it('omite los parámetros que no se envían', () => {
    service.getTariffs({ page: 1 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === endpoint);

    expect(req.request.params.get('search')).toBeNull();
    expect(req.request.params.get('nombre')).toBeNull();
    expect(req.request.params.get('limit')).toBeNull();

    req.flush({ data: [] });
  });

  it('mantiene el filtro puntual por nombre', () => {
    service.getTariffs({ nombre: 'Comercial' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === endpoint);

    expect(req.request.params.get('nombre')).toBe('Comercial');
    expect(req.request.params.get('search')).toBeNull();

    req.flush({ data: [] });
  });
});
