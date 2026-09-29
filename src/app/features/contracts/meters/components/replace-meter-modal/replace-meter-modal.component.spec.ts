import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ReplaceMeterModalComponent } from './replace-meter-modal.component';
import { MetersApi } from '../../data/meters.api';
import { PeriodsService } from '../../../../../shared/services/periods.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { IContract } from '../../../service-contracts/interfaces/icontract.interface';
import { IMeter, IReplaceMeterResponse } from '../../domain/models/meter.model';

describe('ReplaceMeterModalComponent', () => {
  let component: ReplaceMeterModalComponent;
  let fixture: ComponentFixture<ReplaceMeterModalComponent>;

  const mockAvailableMeters: IMeter[] = [
    {
      medidorId: 200,
      serie: 'MED-NEW-1',
      marca: 'Siemens',
      modelo: 'CX200',
      estado: { codigo: 'BODEGA', nombre: 'Bodega', orden: 1 },
      fechaInstalacion: null,
      contratoId: null,
    },
    {
      medidorId: 201,
      serie: 'MED-NEW-2',
      marca: 'Itron',
      modelo: 'Smart',
      estado: { codigo: 'BODEGA', nombre: 'Bodega', orden: 1 },
      fechaInstalacion: null,
      contratoId: null,
    },
  ];

  const mockContract: IContract = {
    contratoId: '1',
    clienteId: '10',
    sectorId: 1,
    categoriaTarifaId: 1,
    numeroGuia: 'GUI-001',
    fechaInicio: '2026-01-01',
    direccionSuministro: 'Av Principal 123',
    estadoServicio: 'ACTIVO',
    comunidadId: 1,
    categoriaTarifa: {
      categoriaTarifaId: 1,
      nombre: 'Residencial',
      descripcion: 'Tarifa básica',
      valorBase: 5,
      consumoMinimoMensual: 10,
      valorExcedenteM3: 0.5,
    },
    cliente: {
      clienteId: '10',
      identificacion: '1234567890',
      nombres: 'Juan',
      apellidos: 'Pérez',
      razonSocial: null,
      email: 'juan@test.com',
      telefono: '0999999999',
      direccionDomicilio: 'Calle 1',
    },
    comunidad: {
      comunidadId: 1,
      codigo: 'COM-01',
      nombre: 'Comunidad Central',
    },
    sector: {
      sectorId: 1,
      codigo: 'SEC-01',
      nombre: 'Sector Norte',
    },
    historialMedidores: [
      {
        historialId: '100',
        medidorId: '50',
        fechaDesde: '2026-01-01',
        fechaHasta: null,
        lecturaInicial: 500,
        lecturaFinal: null,
        medidor: {
          medidorId: '50',
          serie: 'MED-OLD-1',
          marca: 'Actaris',
          modelo: 'A100',
        },
      },
    ],
  };

  const mockPeriods = [
    { periodoId: 1, nombre: 'Enero 2026', estado: 'ABIERTO' },
    { periodoId: 2, nombre: 'Febrero 2026', estado: 'CERRADO' },
  ];

  const mockMetersService = {
    getMeters: vi.fn().mockReturnValue(of({ data: mockAvailableMeters, meta: { total: 2 } })),
    replaceMeter: vi.fn(),
  };

  const mockPeriodsService = {
    getPeriods: vi.fn().mockReturnValue(of(mockPeriods)),
  };

  const mockToastService = {
    show: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ReplaceMeterModalComponent],
      providers: [
        FormBuilder,
        { provide: MetersApi, useValue: mockMetersService },
        { provide: PeriodsService, useValue: mockPeriodsService },
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
    expect(component.availableMeters().length).toBe(2);
    expect(component.periodos().length).toBe(2);
    expect(component.baseReading()).toBe(500);
    expect(component.currentStep()).toBe(1);
    expect(component.form.controls.periodoOrigenId.value).toBe(1);
  });

  it('should select meter and advance through wizard steps', () => {
    component.form.controls.lecturaFinalSaliente.setValue(530);
    component.form.controls.motivo.setValue('DANO');

    // Go to step 2
    component.goToStep(2);
    expect(component.currentStep()).toBe(2);

    // Select meter
    const meterToSelect = component.availableMeters()[0];
    component.selectMeter(meterToSelect);
    expect(component.selectedNewMeter()).toBe(meterToSelect);
    expect(component.form.controls.nuevoMedidorId.value).toBe('200');

    // Go to step 3
    component.goToStep(3);
    expect(component.currentStep()).toBe(3);
  });

  it('should reject step 2 progression if reading in step 1 is lower than base', () => {
    component.form.controls.lecturaFinalSaliente.setValue(450); // Lower than 500
    component.goToStep(2);

    expect(component.currentStep()).toBe(1);
    expect(component.errorMessage()).toContain('no puede ser menor a la lectura base');
  });

  it('should apply reactive validations for partial charge and deferred treatment', () => {
    component.form.controls.tratamientoSaliente.setValue('COBRO_PARCIAL');
    expect(component.form.controls.porcentajeCobro.validator).toBeTruthy();

    component.form.controls.tratamientoSaliente.setValue('COBRO_REAL');
    expect(component.form.controls.porcentajeCobro.validator).toBeNull();

    component.form.controls.tratamientoEntrante.setValue('DIFERIR_SIGUIENTE_PERIODO');
    expect(component.form.controls.periodoDestinoId.validator).toBeTruthy();
    expect(component.form.controls.mesDestino.validator).toBeTruthy();

    component.form.controls.tratamientoEntrante.setValue('FACTURAR_PERIODO_ACTUAL');
    expect(component.form.controls.periodoDestinoId.validator).toBeNull();
    expect(component.form.controls.mesDestino.validator).toBeNull();
  });

  it('should submit replace meter request when confirmed on step 3', () => {
    mockMetersService.replaceMeter.mockReturnValue(of({} as IReplaceMeterResponse));

    component.form.patchValue({
      nuevoMedidorId: '200',
      lecturaFinalSaliente: 530,
      lecturaInicialEntrante: 0,
      motivo: 'DANO',
      responsabilidadDano: 'JUNTA',
      tratamientoSaliente: 'COBRO_REAL',
      tratamientoEntrante: 'FACTURAR_PERIODO_ACTUAL',
      periodoOrigenId: 1,
      mesOrigen: 8,
    });
    component.selectMeter(component.availableMeters()[0]);

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
        mesOrigen: 8,
      }),
    );
    // La clave de idempotencia se genera por operación y se envía siempre
    expect(
      (mockMetersService.replaceMeter.mock.calls[0][0] as { claveIdempotencia: string })
        .claveIdempotencia,
    ).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
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
    component.selectMeter(component.availableMeters()[0]);

    component.onSubmit();

    expect(component.errorMessage()).toBe('El medidor ya está asignado');
    expect(component.isSaving()).toBeFalsy();
  });

  it('should surface backend validation details from errors[] instead of the generic message', () => {
    mockMetersService.replaceMeter.mockReturnValue(
      throwError(() => ({
        error: {
          message: 'Error de validación',
          errors: [
            'La clave de idempotencia debe ser un UUID v4',
            'El detalle del motivo es obligatorio cuando el motivo es OTRO',
          ],
        },
      })),
    );

    component.form.patchValue({
      nuevoMedidorId: '200',
      lecturaFinalSaliente: 530,
      lecturaInicialEntrante: 0,
      motivo: 'OTRO',
      detalleMotivo: 'Fuga visible',
      tratamientoSaliente: 'COBRO_REAL',
      tratamientoEntrante: 'FACTURAR_PERIODO_ACTUAL',
      periodoOrigenId: 1,
    });
    component.selectMeter(component.availableMeters()[0]);

    component.onSubmit();

    expect(component.errorMessage()).toContain('La clave de idempotencia debe ser un UUID v4');
    expect(component.errorMessage()).not.toBe('Error de validación');
    expect(component.isSaving()).toBeFalsy();
  });

  it('should handle server search and pagination triggers', () => {
    component.onPageSizeChange(10);
    expect(component.pageSize()).toBe(10);
    expect(component.currentPage()).toBe(1);

    component.onPageChange(2);
    expect(component.currentPage()).toBe(2);

    component.onSearchQueryChange('Siemens');
    expect(component.meterSearchQuery()).toBe('Siemens');
    expect(component.currentPage()).toBe(1);
  });

  it('should advance to step 4 (Resumen) when all previous steps are valid', () => {
    component.form.controls.lecturaFinalSaliente.setValue(530);
    component.form.controls.motivo.setValue('DANO');
    component.form.controls.responsabilidadDano.setValue('JUNTA');
    component.goToStep(2);
    component.selectMeter(component.availableMeters()[0]);
    component.goToStep(3);
    expect(component.currentStep()).toBe(3);

    component.goToStep(4);
    expect(component.currentStep()).toBe(4);
    expect(component.getStepErrors().length).toBe(0);
  });

  it('should not advance to step 4 and expose stepErrors when step 3 has validation errors', () => {
    component.form.controls.lecturaFinalSaliente.setValue(530);
    component.form.controls.motivo.setValue('DANO');
    component.form.controls.responsabilidadDano.setValue('JUNTA');
    component.goToStep(2);
    component.selectMeter(component.availableMeters()[0]);
    component.goToStep(3);

    // Break step 3: missing billing period
    component.form.controls.periodoOrigenId.setValue(null);

    component.goToStep(4);
    expect(component.currentStep()).toBe(3);
    expect(component.getStepErrors().some((e) => e.step === 3)).toBe(true);
    expect(mockMetersService.replaceMeter).not.toHaveBeenCalled();
  });

  it('should mark attempted steps so per-field errors become visible', () => {
    component.form.controls.lecturaFinalSaliente.setValue(450); // below base 500
    component.goToStep(2);

    expect(component.currentStep()).toBe(1);
    expect(component.stepAttempted(1)).toBe(true);
    expect(component.readingBelowBase()).toBe(true);
  });

  it('should close on escape key when not saving', () => {
    vi.spyOn(component.cancelled, 'emit');
    component.handleEscape();
    expect(component.cancelled.emit).toHaveBeenCalled();
  });

  it('should not close on escape key while saving', () => {
    vi.spyOn(component.cancelled, 'emit');
    component.isSaving.set(true);
    component.handleEscape();
    expect(component.cancelled.emit).not.toHaveBeenCalled();
  });

  it('should prioritize ultimaLecturaAprobada over lecturaInicial in baseReading', () => {
    const contractWithApprovedReading: IContract = {
      ...mockContract,
      historialMedidores: [
        {
          historialId: '100',
          medidorId: '50',
          fechaDesde: '2026-01-01',
          fechaHasta: null,
          lecturaInicial: 500,
          lecturaFinal: null,
          ultimaLecturaAprobada: {
            lecturaId: '999',
            fecha: '2026-08-01',
            lecturaActual: 700,
          },
          medidor: {
            medidorId: '50',
            serie: 'MED-OLD-1',
            marca: 'Actaris',
            modelo: 'A100',
          },
        },
      ],
    };

    fixture.componentRef.setInput('contract', contractWithApprovedReading);
    fixture.detectChanges();

    expect(component.baseReading()).toBe(700);
  });

  describe('Step 3 — All Economic Treatments & Invalid Edge Cases', () => {
    beforeEach(() => {
      // Advance to step 3 cleanly
      component.form.controls.lecturaFinalSaliente.setValue(530);
      component.form.controls.motivo.setValue('DANO');
      component.form.controls.responsabilidadDano.setValue('JUNTA');
      component.goToStep(2);
      component.selectMeter(component.availableMeters()[0]);
      component.goToStep(3);
    });

    it('Tratamiento Válido 1: EXONERADO (0 m³ cobrados)', () => {
      mockMetersService.replaceMeter.mockReturnValue(of({} as IReplaceMeterResponse));

      component.form.controls.tratamientoSaliente.setValue('EXONERADO');
      component.form.controls.tratamientoEntrante.setValue('FACTURAR_PERIODO_ACTUAL');

      component.onSubmit();

      expect(mockMetersService.replaceMeter).toHaveBeenCalledWith(
        expect.objectContaining({
          tratamientoSaliente: 'EXONERADO',
          tratamientoEntrante: 'FACTURAR_PERIODO_ACTUAL',
        }),
      );
    });

    it('Tratamiento Válido 2: PROMEDIO_HISTORICO con ventana de 6 meses', () => {
      mockMetersService.replaceMeter.mockReturnValue(of({} as IReplaceMeterResponse));

      component.form.controls.tratamientoSaliente.setValue('PROMEDIO_HISTORICO');
      component.form.controls.ventanaPromedio.setValue(6);

      component.onSubmit();

      expect(mockMetersService.replaceMeter).toHaveBeenCalledWith(
        expect.objectContaining({
          tratamientoSaliente: 'PROMEDIO_HISTORICO',
          ventanaPromedio: 6,
        }),
      );
    });

    it('Tratamiento Válido 3: DIFERIR_SIGUIENTE_PERIODO con mes y período destino válidos', () => {
      mockMetersService.replaceMeter.mockReturnValue(of({} as IReplaceMeterResponse));

      component.form.controls.tratamientoEntrante.setValue('DIFERIR_SIGUIENTE_PERIODO');
      component.form.controls.periodoDestinoId.setValue(2);
      component.form.controls.mesDestino.setValue(9);

      component.onSubmit();

      expect(mockMetersService.replaceMeter).toHaveBeenCalledWith(
        expect.objectContaining({
          tratamientoEntrante: 'DIFERIR_SIGUIENTE_PERIODO',
          periodoDestinoId: 2,
          mesDestino: 9,
        }),
      );
    });

    it('Caso Inválido 1: COBRO_PARCIAL sin especificar porcentaje', () => {
      component.form.controls.tratamientoSaliente.setValue('COBRO_PARCIAL');
      component.form.controls.porcentajeCobro.setValue(null);

      component.onSubmit();

      expect(component.form.invalid).toBe(true);
      expect(component.form.controls.porcentajeCobro.valid).toBe(false);
      expect(mockMetersService.replaceMeter).not.toHaveBeenCalled();
    });

    it('Caso Inválido 2: COBRO_PARCIAL con porcentaje fuera de rango (>100 o <=0)', () => {
      component.form.controls.tratamientoSaliente.setValue('COBRO_PARCIAL');
      component.form.controls.porcentajeCobro.setValue(150);

      expect(component.form.controls.porcentajeCobro.valid).toBe(false);

      component.form.controls.porcentajeCobro.setValue(0);
      expect(component.form.controls.porcentajeCobro.valid).toBe(false);
    });

    it('Caso Inválido 3: DIFERIR_SIGUIENTE_PERIODO sin período ni mes destino', () => {
      component.form.controls.tratamientoEntrante.setValue('DIFERIR_SIGUIENTE_PERIODO');
      component.form.controls.periodoDestinoId.setValue(null);
      component.form.controls.mesDestino.setValue(null);

      component.onSubmit();

      expect(component.form.invalid).toBe(true);
      expect(component.form.controls.periodoDestinoId.valid).toBe(false);
      expect(component.form.controls.mesDestino.valid).toBe(false);
      expect(mockMetersService.replaceMeter).not.toHaveBeenCalled();
    });

    it('Caso Inválido 4: Motivo OTRO sin detalle explicativo', () => {
      component.form.controls.motivo.setValue('OTRO');
      component.form.controls.detalleMotivo.setValue('');

      component.onSubmit();

      expect(component.form.invalid).toBe(true);
      expect(component.form.controls.detalleMotivo.valid).toBe(false);
      expect(mockMetersService.replaceMeter).not.toHaveBeenCalled();
    });

    it('Caso Inválido 5: Falta de período de facturación origen', () => {
      component.form.controls.periodoOrigenId.setValue(null);

      component.onSubmit();

      expect(component.form.invalid).toBe(true);
      expect(mockMetersService.replaceMeter).not.toHaveBeenCalled();
    });
  });
});
