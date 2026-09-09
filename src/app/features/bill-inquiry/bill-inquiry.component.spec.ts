import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ConsultaPlanillaService, DeudaPublicaResponse } from './bill-inquiry.service';
import { BillInquiryComponent } from './bill-inquiry.component';
import { environment } from '../../../environments/environment';
import { provideRouter } from '@angular/router';

describe('ConsultaPlanillaService (SC-235)', () => {
  let service: ConsultaPlanillaService;
  let httpTesting: HttpTestingController;

  const mockResponse: DeudaPublicaResponse = {
    cliente: {
      nombre: 'JUAN PEREZ',
      identificacion: '0912345678',
    },
    contratos: [
      {
        contratoId: '1',
        numeroGuia: '001-001-000001',
        estado: 'ACTIVO',
        saldoVencido: 45.0,
        deudaAnterior: 15.0,
        mesesAtrasado: 2,
      },
    ],
    totalDeuda: 45.0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ConsultaPlanillaService],
    });
    service = TestBed.inject(ConsultaPlanillaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('debe enviar la petición GET a /search con los query params correctos', async () => {
    const promise = service.consultar('0912345678', 'identificacion');

    const req = httpTesting.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/search` &&
        request.params.get('tipo') === 'identificacion' &&
        request.params.get('valor') === '0912345678',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    const res = await promise;
    expect(res).toEqual(mockResponse);
    httpTesting.verify();
  });
});

describe('BillInquiryComponent (SC-235)', () => {
  let component: BillInquiryComponent;
  let service: ConsultaPlanillaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BillInquiryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    const fixture = TestBed.createComponent(BillInquiryComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ConsultaPlanillaService);
  });

  it('no debe consultar si el término tiene menos de 2 caracteres', async () => {
    const spy = vi.spyOn(service, 'consultar');
    component.terminoBusqueda.set('a');
    await component.consultar();
    expect(spy).not.toHaveBeenCalled();
    expect(component.results()).toBeNull();
  });

  it('debe actualizar results y signal del servicio cuando la API responde con éxito', async () => {
    const mockData: DeudaPublicaResponse = {
      cliente: { nombre: 'MARIA LOPEZ', identificacion: '1723456789' },
      contratos: [],
      totalDeuda: 0,
    };
    vi.spyOn(service, 'consultar').mockResolvedValue(mockData);

    component.terminoBusqueda.set('1723456789');
    await component.consultar();

    expect(component.results()).toEqual(mockData);
    expect(component.loading()).toBe(false);
    expect(component.noResults()).toBe(false);
  });

  it('debe manejar error 404 activando noResults', async () => {
    vi.spyOn(service, 'consultar').mockRejectedValue({ status: 404 });

    component.terminoBusqueda.set('9999999999');
    await component.consultar();

    expect(component.noResults()).toBe(true);
    expect(component.results()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('debe manejar error 429 mostrando mensaje de límite de tasa', async () => {
    vi.spyOn(service, 'consultar').mockRejectedValue({ status: 429 });

    component.terminoBusqueda.set('1723456789');
    await component.consultar();

    expect(component.errorMessage()).toContain('Demasiadas consultas');
    expect(component.loading()).toBe(false);
  });
});
