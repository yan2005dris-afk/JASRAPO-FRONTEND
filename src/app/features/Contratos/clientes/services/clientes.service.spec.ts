import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ClientesService } from './clientes.service';
import {
  ActualizarClienteRequest,
  CrearClienteRequest,
  IClientes,
  IIdentificacion,
  IPaginatedResult,
} from '../interfaces/iclientes.interface';
import { environment } from '../../../../../environments/environment';

describe('ClientesService', () => {
  let service: ClientesService;
  let httpMock: HttpTestingController;

  const endpoint = `${environment.apiUrl}/clients`;

  const clienteMock: IClientes = {
    clienteId: '1',
    tipoIdentificacionId: '1',
    tipoIdentificacion: {
      identificacionId: '1',
      codigo: 'CEDULA',
      nombre: 'Cédula de Identidad',
      activo: true,
      orden: 1,
    },
    identificacion: '0944288513',
    nombres: 'Luis',
    apellidos: 'Anchundia',
    razonSocial: null,
    email: 'luis@example.com',
    telefono: '0987654321',
    telefonoSecundario: null,
    aplicaTerceraEdad: false,
    aplicaDiscapacidad: false,
    direccionDomicilio: 'Playas',
    activo: true,
  };

  const paginatedMock: IPaginatedResult<IClientes> = {
    data: [clienteMock],
    meta: {
      total: 1,
      page: 1,
      limit: 5,
      ultimaPagina: 1,
      paginaActual: 1,
      porPagina: 5,
      anterior: null,
      siguiente: null,
    },
  };

  const tiposIdentificacionMock: IIdentificacion[] = [
    {
      identificacionId: '1',
      codigo: 'CEDULA',
      nombre: 'Cédula de Identidad',
      activo: true,
      orden: 1,
    },
    {
      identificacionId: '2',
      codigo: 'RUC',
      nombre: 'RUC',
      activo: true,
      orden: 2,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClientesService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ClientesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should search clientes without filters (all clients)', () => {
    service.buscarClientes({ page: 1, limit: 5 }).subscribe((result) => {
      expect(result.data).toEqual([clienteMock]);
      expect(result.meta.total).toBe(1);
    });

    const req = httpMock.expectOne((request) => request.url === endpoint);

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('5');

    req.flush(paginatedMock);
  });

  it('should search clientes with filters', () => {
    service
      .buscarClientes({
        nombreCompleto: 'Luis Anchundia',
        identificacion: '0944288513',
        activo: true,
        page: 1,
        limit: 10,
      })
      .subscribe((result) => {
        expect(result.data).toEqual([clienteMock]);
      });

    const req = httpMock.expectOne((request) => request.url === endpoint);

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('nombreCompleto')).toBe('Luis Anchundia');
    expect(req.request.params.get('identificacion')).toBe('0944288513');
    expect(req.request.params.get('activo')).toBe('true');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');

    req.flush(paginatedMock);
  });

  it('should get cliente by id', () => {
    service.getClienteById('1').subscribe((cliente) => {
      expect(cliente).toEqual(clienteMock);
    });

    const req = httpMock.expectOne(`${endpoint}/1`);

    expect(req.request.method).toBe('GET');

    req.flush(clienteMock);
  });

  it('should create cliente', () => {
    const nuevoCliente: CrearClienteRequest = {
      tipoIdentificacionId: 1,
      identificacion: '0944288513',
      nombres: 'Luis',
      apellidos: 'Anchundia',
      razonSocial: null,
      email: 'luis@example.com',
      telefono: '0987654321',
      telefonoSecundario: null,
      aplicaTerceraEdad: false,
      aplicaDiscapacidad: false,
      direccionDomicilio: 'Playas',
    };

    service.createCliente(nuevoCliente).subscribe((cliente) => {
      expect(cliente).toEqual(clienteMock);
    });

    const req = httpMock.expectOne(endpoint);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevoCliente);

    req.flush(clienteMock);
  });

  it('should update cliente', () => {
    const clienteActualizado: ActualizarClienteRequest = {
      email: 'nuevo@example.com',
      telefono: '0999999999',
    };

    service.updateCliente('1', clienteActualizado).subscribe((cliente) => {
      expect(cliente).toEqual({
        ...clienteMock,
        email: 'nuevo@example.com',
        telefono: '0999999999',
      });
    });

    const req = httpMock.expectOne(`${endpoint}/1`);

    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(clienteActualizado);

    req.flush({
      ...clienteMock,
      email: 'nuevo@example.com',
      telefono: '0999999999',
    });
  });

  it('should delete cliente', () => {
    service.deleteCliente('1').subscribe((response) => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${endpoint}/1`);

    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });

  it('should get tipos de identificacion', () => {
    service.getTiposIdentificacion().subscribe((tipos) => {
      expect(tipos).toEqual(tiposIdentificacionMock);
    });

    const req = httpMock.expectOne(`${endpoint}/identification-types`);

    expect(req.request.method).toBe('GET');

    req.flush(tiposIdentificacionMock);
  });
});
