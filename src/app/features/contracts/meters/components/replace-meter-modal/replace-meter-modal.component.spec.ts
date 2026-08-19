import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ReplaceMeterModalComponent } from './replace-meter-modal.component';
import { MetersService } from '../../services/meters.service';
import { ReadingRoutesService } from '../../../reading-routes/services/reading-routes.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { IContract } from '../../../service-contracts/interfaces/icontract.interface';

describe('ReplaceMeterModalComponent', () => {
  let component: ReplaceMeterModalComponent;
  let fixture: ComponentFixture<ReplaceMeterModalComponent>;

  const mockMetersService = {
    getMeters: vi.fn(),
    replaceMeter: vi.fn(),
  };

  const mockRoutesService = {
    getPeriods: vi.fn(),
  };

  const mockToastService = {
    show: vi.fn(),
  };

  const mockContract: IContract = {
    contratoId: '1',
    numeroGuia: '101',
    clienteId: '1',
    sectorId: null,
    categoriaTarifaId: 1,
    fechaInicio: '2026-01-01',
    direccionSuministro: 'Av Principal',
    comunidadId: 1,
    cliente: {
      clienteId: '1',
      identificacion: '0102030405',
      nombres: 'Juan',
      apellidos: 'Pérez',
      razonSocial: null,
      email: null,
      telefono: null,
      direccionDomicilio: null,
    },
    comunidad: {
      comunidadId: 1,
      codigo: 'COM-01',
      nombre: 'Centro',
    },
    categoriaTarifa: {
      categoriaTarifaId: 1,
      nombre: 'Residencial',
      descripcion: 'Tarifa Residencial',
      valorBase: 5,
      consumoMinimoMensual: 10,
      valorExcedenteM3: 0.5,
    },
    sector: null,
    estado: 'ACTIVO',
    historialMedidores: [
      {
        historialId: '10',
        medidorId: '100',
        fechaDesde: '2026-01-01',
        fechaHasta: null,
        lecturaInicial: 500,
        lecturaFinal: null,
        medidor: {
          medidorId: '100',
          marca: 'Itron',
          modelo: 'CX1000',
          serie: 'MED-500',
        },
      },
    ],
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockMetersService.getMeters.mockReturnValue(
      of({
        datos: [
          {
            medidorId: 200,
            marca: 'Siemens',
            modelo: 'Digital',
            serie: 'MED-NEW-1',
            fechaInstalacion: null,
            contratoId: null,
            latitud: null,
            longitud: null,
          },
        ],
        paginacion: {
          total: 1,
          paginaActual: 1,
          porPagina: 10,
          ultimaPagina: 1,
          anterior: null,
          siguiente: null,
        },
        kpis: { enBodega: 1, instalados: 0, danados: 0, total: 1 },
      }),
    );

    mockRoutesService.getPeriods.mockReturnValue(
      of([
        {
          periodoId: 1,
          nombre: 'Enero 2026',
          estado: 'ABIERTO',
        },
      ]),
    );

    await TestBed.configureTestingModule({
      imports: [ReplaceMeterModalComponent],
      providers: [
        { provide: MetersService, useValue: mockMetersService },
        { provide: ReadingRoutesService, useValue: mockRoutesService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReplaceMeterModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('contract', mockContract);
    fixture.detectChanges();
  });

  it('should create and populate available meters and active period', () => {
    expect(component).toBeTruthy();
    expect(component.availableMeters().length).toBe(1);
    expect(component.periodos().length).toBe(1);
    expect(component.baseReading()).toBe(500);
    expect(component.form.controls.periodoOrigenId.value).toBe(1);
  });

  it('should reject final reading lower than base reading', () => {
    component.form.patchValue({
      nuevoMedidorId: '200',
      lecturaFinalSaliente: 480, // Lower than 500
      lecturaInicialEntrante: 0,
      motivo: 'DANO',
      tratamientoSaliente: 'COBRO_REAL',
      tratamientoEntrante: 'FACTURAR_PERIODO_ACTUAL',
      periodoOrigenId: 1,
    });

    component.onSubmit();
    expect(component.errorMessage()).toContain('no puede ser menor a la lectura inicial');
    expect(mockMetersService.replaceMeter).not.toHaveBeenCalled();
  });

  it('should submit replace meter request when valid', () => {
    mockMetersService.replaceMeter.mockReturnValue(
      of({} as import('../../interfaces/imeter.interface').IReplaceMeterResponse),
    );

    component.form.patchValue({
      nuevoMedidorId: '200',
      lecturaFinalSaliente: 530,
      lecturaInicialEntrante: 0,
      motivo: 'DANO',
      responsabilidadDano: 'JUNTA',
      tratamientoSaliente: 'COBRO_REAL',
      tratamientoEntrante: 'FACTURAR_PERIODO_ACTUAL',
      periodoOrigenId: 1,
    });

    vi.spyOn(component.saved, 'emit');

    component.onSubmit();

    expect(mockMetersService.replaceMeter).toHaveBeenCalledWith(
      expect.objectContaining({
        contratoId: '1',
        nuevoMedidorId: '200',
        lecturaFinalSaliente: 530,
        lecturaInicialEntrante: 0,
        motivo: 'DANO',
        responsabilidadDano: 'JUNTA',
        tratamientoSaliente: 'COBRO_REAL',
      }),
    );
    expect(component.saved.emit).toHaveBeenCalled();
  });

  it('should handle service errors gracefully', () => {
    mockMetersService.replaceMeter.mockReturnValue(
      throwError(() => ({ error: { message: 'El medidor ya está asignado' } })),
    );

    component.form.patchValue({
      nuevoMedidorId: '200',
      lecturaFinalSaliente: 530,
      lecturaInicialEntrante: 0,
      motivo: 'DANO',
      tratamientoSaliente: 'COBRO_REAL',
      tratamientoEntrante: 'FACTURAR_PERIODO_ACTUAL',
      periodoOrigenId: 1,
    });

    component.onSubmit();

    expect(component.errorMessage()).toBe('El medidor ya está asignado');
    expect(component.isSaving()).toBeFalsy();
  });
});
