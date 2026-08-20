import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ReplaceMeterModalComponent } from './replace-meter-modal.component';
import { MetersService } from '../../services/meters.service';
import { ReadingRoutesService } from '../../../reading-routes/services/reading-routes.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { IContract } from '../../../service-contracts/interfaces/icontract.interface';
import { IMeter, IReplaceMeterResponse } from '../../interfaces/imeter.interface';

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
      latitud: null,
      longitud: null,
    },
    {
      medidorId: 201,
      serie: 'MED-NEW-2',
      marca: 'Itron',
      modelo: 'Smart',
      estado: { codigo: 'BODEGA', nombre: 'Bodega', orden: 1 },
      fechaInstalacion: null,
      contratoId: null,
      latitud: null,
      longitud: null,
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
    estado: 'ACTIVO',
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
    getMeters: vi.fn().mockReturnValue(of({ datos: mockAvailableMeters, total: 2 })),
    replaceMeter: vi.fn(),
  };

  const mockRoutesService = {
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
    expect(component.errorMessage()).toContain('no puede ser menor a la lectura base previa');
  });

  it('should apply reactive validations for partial charge and deferred treatment', () => {
    component.form.controls.tratamientoSaliente.setValue('COBRO_PARCIAL');
    expect(component.form.controls.porcentajeCobro.validator).toBeTruthy();

    component.form.controls.tratamientoSaliente.setValue('COBRO_REAL');
    expect(component.form.controls.porcentajeCobro.validator).toBeNull();

    component.form.controls.tratamientoEntrante.setValue('DIFERIR_SIGUIENTE_PERIODO');
    expect(component.form.controls.periodoDestinoId.validator).toBeTruthy();

    component.form.controls.tratamientoEntrante.setValue('FACTURAR_PERIODO_ACTUAL');
    expect(component.form.controls.periodoDestinoId.validator).toBeNull();
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
    component.selectMeter(component.availableMeters()[0]);

    component.onSubmit();

    expect(component.errorMessage()).toBe('El medidor ya está asignado');
    expect(component.isSaving()).toBeFalsy();
  });

  it('should handle server search and pagination triggers', () => {
    component.onPageSizeChange(10);
    expect(component.pageSize()).toBe(10);
    expect(component.currentPage()).toBe(1);
    expect(mockMetersService.getMeters).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, page: 1 }),
    );

    component.onPageChange(2);
    expect(component.currentPage()).toBe(2);
    expect(mockMetersService.getMeters).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, page: 2 }),
    );

    component.onSearchQueryChange('Siemens');
    expect(component.meterSearchQuery()).toBe('Siemens');
    expect(component.currentPage()).toBe(1);
    expect(mockMetersService.getMeters).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Siemens', page: 1 }),
    );
  });

  it('should close on escape key', () => {
    vi.spyOn(component.cancelled, 'emit');
    component.handleEscape();
    expect(component.cancelled.emit).toHaveBeenCalled();
  });
});
