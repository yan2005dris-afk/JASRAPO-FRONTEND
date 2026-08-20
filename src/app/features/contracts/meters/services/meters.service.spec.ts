import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MetersService } from './meters.service';
import {
  IMeter,
  IUpdateMeterStatusBody,
  ISearchMetersParams,
  IPaginatedMetersResponse,
} from '../interfaces/imeter.interface';
import { environment } from '../../../../../environments/environment';

describe('MetersService', () => {
  let service: MetersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MetersService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MetersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse el servicio correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debería actualizar el estado de un medidor usando MeterStatusCode tipado', () => {
    const medidorId = 1;
    // Usamos explícitamente un tipo válido para MeterStatusCode (ej: 'BODEGA')
    const body: IUpdateMeterStatusBody = {
      estado: 'BODEGA',
      motivo: 'Motivo de prueba',
    };

    const mockResponse: IMeter = {
      medidorId,
      marca: 'TestMarca',
      modelo: 'TestModelo',
      serie: 'TestSerie',
      estado: { codigo: 'BODEGA', nombre: 'Bodega', orden: 1 },
      fechaInstalacion: null,
      contratoId: null,
      latitud: null,
      longitud: null,
    };

    service.updateMeter(medidorId, body).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/meters/${medidorId}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(body);
    req.flush(mockResponse);
  });

  it('debería buscar medidores filtrando por MeterStatusCode', () => {
    // Parámetros usando MeterStatusCode ('INSTALADO')
    const params: ISearchMetersParams = {
      page: 1,
      limit: 10,
      estado: 'INSTALADO',
      search: '123',
    };

    const mockResponse: IPaginatedMetersResponse = {
      datos: [],
      paginacion: {
        total: 0,
        paginaActual: 1,
        porPagina: 10,
        ultimaPagina: 1,
        anterior: null,
        siguiente: null,
      },
      kpis: { enBodega: 0, instalados: 0, danados: 0, total: 0 },
    };

    service.getMeters(params).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne((request) =>
      request.url.includes(`${environment.apiUrl}/meters`),
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('estado')).toBe('INSTALADO');
    expect(req.request.params.get('search')).toBe('123');
    req.flush(mockResponse);
  });

  it('debería solicitar la exportación en PDF como Blob con los filtros', () => {
    service.exportMeters('pdf', { estado: 'INSTALADO', search: '123' }).subscribe((res) => {
      expect(res).toBeInstanceOf(Blob);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/meters/export/pdf?estado=INSTALADO&search=123`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });

  it('debería solicitar la exportación en CSV sin filtros vacíos', () => {
    service.exportMeters('csv', { search: ' ' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/meters/export/csv`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(new Blob(['csv'], { type: 'text/csv' }));
  });
});
