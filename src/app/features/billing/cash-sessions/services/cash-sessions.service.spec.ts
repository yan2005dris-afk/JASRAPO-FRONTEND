import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CashSessionsService } from './cash-sessions.service';
import { environment } from '../../../../../environments/environment';
import {
  ICashSession,
  IOpenCashSessionDto,
  ICreateCashMovementDto,
  ICloseCashSessionDto,
} from '../interfaces/icash-session.interface';

describe('CashSessionsService', () => {
  let service: CashSessionsService;
  let httpTesting: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/cash-sessions`;

  const mockSession: ICashSession = {
    cajaId: '1',
    creadoPor: 'cajero@test.com',
    fechaApertura: '2026-08-15T08:00:00Z',
    montoApertura: 50.0,
    estado: 'ABIERTA',
    resumen: {
      totalRecaudado: 200,
      totalEfectivo: 150,
      totalTransferencia: 50,
      totalTarjeta: 0,
      totalEgresos: 15,
      totalIngresosExtra: 0,
      efectivoEsperado: 185,
      cantidadPagos: 4,
      cantidadMovimientos: 1,
    },
    movimientos: [],
    pagos: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CashSessionsService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CashSessionsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Valid Data Requests', () => {
    it('should retrieve current active session', () => {
      service.getCurrentSession().subscribe((session) => {
        expect(session).toEqual(mockSession);
        expect(session?.estado).toBe('ABIERTA');
      });

      const req = httpTesting.expectOne(`${baseUrl}/current`);
      expect(req.request.method).toBe('GET');
      req.flush(mockSession);
    });

    it('should open a new cash session with valid payload', () => {
      const openDto: IOpenCashSessionDto = {
        montoApertura: 100,
      };

      service.openSession(openDto).subscribe((session) => {
        expect(session).toEqual(mockSession);
      });

      const req = httpTesting.expectOne(`${baseUrl}/open`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(openDto);
      req.flush(mockSession);
    });

    it('should record a valid cash movement (expense/income)', () => {
      const movementDto: ICreateCashMovementDto = {
        tipoMovimiento: 'EGRESO',
        monto: 12.5,
        motivo: 'Compra de suministros de limpieza',
      };

      service.addMovement('1', movementDto).subscribe((res) => {
        expect(res.monto).toBe(12.5);
      });

      const req = httpTesting.expectOne(`${baseUrl}/1/movements`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(movementDto);
      req.flush({ id: '10', ...movementDto, creadoPor: 'user@test.com', createdAt: '2026-08-15' });
    });

    it('should close cash session with physical arqueo balance', () => {
      const closeDto: ICloseCashSessionDto = {
        novedadCierre: 'Cuadre conforme',
        arqueo: [{ denominacion: 20, cantidad: 10, subtotal: 200 }],
      };

      service.closeSession('1', closeDto).subscribe((res) => {
        expect(res.estado).toBe('CERRADA');
      });

      const req = httpTesting.expectOne(`${baseUrl}/1/close`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(closeDto);
      req.flush({ estado: 'CERRADA' });
    });
  });

  describe('Invalid / Error Requests', () => {
    it('should propagate 404 when no session exists', () => {
      let errorResponse: unknown = null;

      service.getCurrentSession().subscribe({
        next: () => {
          throw new Error('Should have failed with 404');
        },
        error: (err) => {
          errorResponse = err;
        },
      });

      const req = httpTesting.expectOne(`${baseUrl}/current`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect((errorResponse as { status: number }).status).toBe(404);
    });

    it('should propagate 400 when opening session fails validation', () => {
      let errorResponse: unknown = null;
      const invalidDto: IOpenCashSessionDto = {
        montoApertura: -50,
      };

      service.openSession(invalidDto).subscribe({
        next: () => {
          throw new Error('Should have failed with 400');
        },
        error: (err) => {
          errorResponse = err;
        },
      });

      const req = httpTesting.expectOne(`${baseUrl}/open`);
      req.flush({ message: 'Monto de apertura inválido' }, { status: 400, statusText: 'Bad Request' });

      expect((errorResponse as { status: number; error: { message: string } }).status).toBe(400);
      expect((errorResponse as { status: number; error: { message: string } }).error.message).toBe(
        'Monto de apertura inválido',
      );
    });
  });
});
