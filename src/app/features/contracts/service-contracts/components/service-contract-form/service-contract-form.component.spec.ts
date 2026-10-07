import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ServiceContractFormComponent } from './service-contract-form.component';
import { ContractsApi } from '../../data/contracts.api';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { IContract } from '../../domain/models/service-contract.model';
import { IMeter } from '../../../meters/domain/models/meter.model';
import { IClient } from '../../../clients/domain/models/client.model';
import { ITariffCategory } from '../../../tariffs/domain/models/tariff.model';
import { IServiceArea } from '../../domain/models/service-area.model';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { CoordinateMapPickerComponent } from '../../../../../shared/components/coordinate-map-picker/coordinate-map-picker.component';

describe('ServiceContractFormComponent', () => {
  let component: ServiceContractFormComponent;
  let fixture: ComponentFixture<ServiceContractFormComponent>;

  const mockContract: IContract = {
    contratoId: '10',
    clienteId: '100',
    sectorId: null,
    categoriaTarifaId: 1,
    comunidadId: 5,
    fechaInicio: '2026-01-01',
    numeroGuia: 'CTR-001',
    direccionSuministro: 'Calle Principal 123',
    estadoServicio: 'ACTIVO',
    estadoCobranza: 'AL_DIA',
    categoriaTarifa: {
      categoriaTarifaId: 1,
      nombre: 'Residencial',
      descripcion: 'Tarifa Residencial',
      valorBase: 5,
      consumoMinimoMensual: 10,
      valorExcedenteM3: 0.5,
    },
    cliente: {
      clienteId: '100',
      identificacion: '0999999999',
      nombres: 'Juan',
      apellidos: 'Perez',
      razonSocial: null,
      email: 'juan@example.com',
      telefono: '0999999999',
      direccionDomicilio: 'Calle 1',
    },
    comunidad: {
      comunidadId: 5,
      codigo: 'COM-01',
      nombre: 'Comunidad Central',
    },
    sector: null,
    historialMedidores: [
      {
        historialId: '1',
        medidorId: '200',
        lecturaInicial: 100,
        fechaDesde: '2026-01-01',
        fechaHasta: null,
        medidor: {
          medidorId: '200',
          serie: 'METER-200',
          marca: 'Actaris',
          modelo: 'A1',
        },
      },
    ],
  };

  const mockContractsApi = {
    createContract: vi.fn(),
    updateContract: vi.fn(),
    getContractById: vi.fn(),
    getServiceArea: vi.fn(),
  };

  const mockServiceArea: IServiceArea = {
    nombre: 'Parroquia Manglaralto',
    fuente: 'OpenStreetMap (relation 278708), ODbL',
    geometria: {
      type: 'Polygon',
      coordinates: [
        [
          [-80.78, -1.83],
          [-80.73, -1.83],
          [-80.73, -1.77],
          [-80.78, -1.83],
        ],
      ],
    },
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  const mockAuthService = {
    isSuperAdmin: vi.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContractsApi.getServiceArea.mockReturnValue(of(mockServiceArea));

    await TestBed.configureTestingModule({
      imports: [ServiceContractFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ContractsApi, useValue: mockContractsApi },
        { provide: ToastService, useValue: mockToastService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceContractFormComponent);
    component = fixture.componentInstance;
  });

  it('should create in creation mode by default', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.isEditing()).toBeFalsy();
  });

  it('should preload contract data in edit mode', () => {
    fixture.componentRef.setInput('contractToEdit', mockContract);
    fixture.detectChanges();

    expect(component.isEditing()).toBeTruthy();
    expect(component.contractToEdit()?.numeroGuia).toBe('CTR-001');
    expect(component.form.get('direccionSuministro')?.value).toBe('Calle Principal 123');
    expect(component.form.get('estadoServicio')?.value).toBe('ACTIVO');
    expect(component.selectedClient()?.identificacion).toBe('0999999999');
    expect(component.selectedMeter()?.serie).toBe('METER-200');
    expect(component.form.get('latitud')?.value).toBeNull();
    expect(component.form.get('longitud')?.value).toBeNull();
    expect(component.coordinates()).toEqual({ latitud: null, longitud: null });
  });

  it('should preload the stored pin coordinates in edit mode when the contract has them', () => {
    const contractWithCoordinates: IContract = {
      ...mockContract,
      latitud: -1.8021,
      longitud: -80.7554,
    };
    fixture.componentRef.setInput('contractToEdit', contractWithCoordinates);
    fixture.detectChanges();

    expect(component.form.get('latitud')?.value).toBe(-1.8021);
    expect(component.form.get('longitud')?.value).toBe(-80.7554);
    expect(component.coordinates()).toEqual({ latitud: -1.8021, longitud: -80.7554 });
  });

  it('should send only contractual fields without medidorId in updateContract payload', () => {
    fixture.componentRef.setInput('contractToEdit', mockContract);
    fixture.detectChanges();

    mockContractsApi.updateContract.mockReturnValue(of(mockContract));
    const savedEmitSpy = vi.spyOn(component.saved, 'emit');

    component.form.patchValue({
      direccionSuministro: 'Nueva Direccion 456',
      estadoServicio: 'SUSPENDIDO',
    });

    component.activeStep.set(2);
    component.save();

    expect(mockContractsApi.updateContract).toHaveBeenCalledWith('10', {
      estadoServicio: 'SUSPENDIDO',
      direccionSuministro: 'Nueva Direccion 456',
      clienteId: '100',
      comunidadId: '5',
      categoriaTarifaId: '1',
      latitud: null,
      longitud: null,
    });
    expect(
      (mockContractsApi.updateContract.mock.calls[0][1] as unknown as Record<string, unknown>)[
        'medidorId'
      ],
    ).toBeUndefined();
    expect(
      (mockContractsApi.updateContract.mock.calls[0][1] as unknown as Record<string, unknown>)[
        'lecturaInicial'
      ],
    ).toBeUndefined();
    expect(savedEmitSpy).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith(
      'Contrato actualizado correctamente',
      'Éxito',
    );
    expect(mockContractsApi.updateContract.mock.calls[0][1]).not.toHaveProperty('estado');
  });

  it('should open and close replace meter modal in edit mode', () => {
    fixture.componentRef.setInput('contractToEdit', mockContract);
    fixture.detectChanges();

    expect(component.isReplaceMeterModalOpen()).toBeFalsy();
    component.openReplaceMeterModal();
    expect(component.isReplaceMeterModalOpen()).toBeTruthy();
    component.closeReplaceMeterModal();
    expect(component.isReplaceMeterModalOpen()).toBeFalsy();
  });

  it('should refresh contract and emit saved onMeterReplaced', () => {
    fixture.componentRef.setInput('contractToEdit', mockContract);
    fixture.detectChanges();

    const updatedContract: IContract = {
      ...mockContract,
      historialMedidores: [
        {
          historialId: '2',
          medidorId: '300',
          lecturaInicial: 0,
          fechaDesde: '2026-02-01',
          fechaHasta: null,
          medidor: {
            medidorId: '300',
            serie: 'METER-300',
            marca: 'Actaris',
            modelo: 'A2',
          },
        },
      ],
    };

    mockContractsApi.getContractById.mockReturnValue(of(updatedContract));
    const savedEmitSpy = vi.spyOn(component.saved, 'emit');

    component.openReplaceMeterModal();
    component.onMeterReplaced();

    expect(component.isReplaceMeterModalOpen()).toBeFalsy();
    expect(mockContractsApi.getContractById).toHaveBeenCalledWith('10');
    expect(component.selectedMeter()?.serie).toBe('METER-300');
    expect(savedEmitSpy).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith(
      'Medidor reemplazado correctamente',
      'Éxito',
    );
  });

  it('should create contract with medidorId and lecturaInicial in create mode', () => {
    fixture.detectChanges();

    mockContractsApi.createContract.mockReturnValue(of(mockContract));
    const savedEmitSpy = vi.spyOn(component.saved, 'emit');

    component.form.patchValue({
      direccionSuministro: 'Calle Nueva 789',
      lecturaInicial: '0',
    });
    component.selectedClient.set({
      clienteId: '101',
      identificacion: '0988888888',
      nombres: 'Ana',
      apellidos: 'Gomez',
    } as unknown as IClient);
    component.selectedMeter.set({
      medidorId: 500,
      serie: 'METER-500',
      marca: 'Actaris',
      modelo: 'A1',
    } as unknown as IMeter);
    component.selectedTariff.set({
      categoriaTarifaId: 2,
      nombre: 'Comercial',
    } as unknown as ITariffCategory);
    component.selectedComunidad.set({
      id: 3,
      nombre: 'Comunidad Norte',
      codigo: 'COM-02',
      porcentajeTasaSeguridad: 0,
    } as Comunidad);

    component.activeStep.set(3);
    component.save();

    expect(mockContractsApi.createContract).toHaveBeenCalledWith({
      clienteId: '101',
      categoriaTarifaId: '2',
      medidorId: '500',
      direccionSuministro: 'Calle Nueva 789',
      comunidadId: '3',
      lecturaInicial: 0,
      tramitadorEsTitular: true,
    });
    expect(mockContractsApi.createContract.mock.calls[0][0]).not.toHaveProperty('estado');
    expect(savedEmitSpy).toHaveBeenCalled();
  });
  it.each(['PENDIENTE_INSPECCION', 'PENDIENTE_PAGO', 'PENDIENTE_INSTALACION', 'RECHAZADO'])(
    'keeps %s controlled by the workflow while allowing detail edits',
    (estadoServicio) => {
      const contract = { ...mockContract, estadoServicio };
      fixture.componentRef.setInput('contractToEdit', contract);
      fixture.componentRef.setInput('states', [
        { codigo: estadoServicio, nombre: estadoServicio, orden: 1 },
        { codigo: 'ACTIVO', nombre: 'Activo', orden: 2 },
      ]);
      fixture.detectChanges();
      expect(component.availableStates().map((state) => state.codigo)).toEqual([estadoServicio]);
      mockContractsApi.updateContract.mockReturnValue(of(contract));
      component.form.patchValue({ direccionSuministro: 'New address' });
      component.activeStep.set(2);
      component.save();
      expect(mockContractsApi.updateContract).toHaveBeenCalled();
      expect(mockContractsApi.updateContract.mock.calls[0][1]).not.toHaveProperty('estadoServicio');
    },
  );

  it('should include picked coordinates in the create payload when both are set', () => {
    fixture.detectChanges();

    mockContractsApi.createContract.mockReturnValue(of(mockContract));

    component.form.patchValue({
      direccionSuministro: 'Calle Nueva 789',
      lecturaInicial: '0',
    });
    component.selectedClient.set({
      clienteId: '101',
      identificacion: '0988888888',
      nombres: 'Ana',
      apellidos: 'Gomez',
    } as unknown as IClient);
    component.selectedMeter.set({
      medidorId: 500,
      serie: 'METER-500',
      marca: 'Actaris',
      modelo: 'A1',
    } as unknown as IMeter);
    component.selectedTariff.set({
      categoriaTarifaId: 2,
      nombre: 'Comercial',
    } as unknown as ITariffCategory);
    component.selectedComunidad.set({
      id: 3,
      nombre: 'Comunidad Norte',
      codigo: 'COM-02',
      porcentajeTasaSeguridad: 0,
    } as Comunidad);
    component.onCoordinatesChange({ latitud: -1.8021, longitud: -80.7554 });

    component.activeStep.set(3);
    component.save();

    expect(mockContractsApi.createContract).toHaveBeenCalledWith(
      expect.objectContaining({ latitud: -1.8021, longitud: -80.7554 }),
    );
  });

  it('should send explicit null coordinates in the update payload when the stored pin is cleared', () => {
    const contractWithCoordinates: IContract = {
      ...mockContract,
      latitud: -1.8021,
      longitud: -80.7554,
    };
    fixture.componentRef.setInput('contractToEdit', contractWithCoordinates);
    fixture.detectChanges();

    mockContractsApi.updateContract.mockReturnValue(of(mockContract));

    component.onCoordinatesChange({ latitud: null, longitud: null });
    component.activeStep.set(2);
    component.save();

    expect(mockContractsApi.updateContract).toHaveBeenCalledWith(
      '10',
      expect.objectContaining({ latitud: null, longitud: null }),
    );
  });

  it('should block save and warn when only one coordinate of the pair is set', () => {
    fixture.detectChanges();

    component.form.patchValue({
      direccionSuministro: 'Calle Nueva 789',
      lecturaInicial: '0',
    });
    component.selectedClient.set({
      clienteId: '101',
      identificacion: '0988888888',
      nombres: 'Ana',
      apellidos: 'Gomez',
    } as unknown as IClient);
    component.selectedMeter.set({
      medidorId: 500,
      serie: 'METER-500',
      marca: 'Actaris',
      modelo: 'A1',
    } as unknown as IMeter);
    component.selectedTariff.set({
      categoriaTarifaId: 2,
      nombre: 'Comercial',
    } as unknown as ITariffCategory);
    component.selectedComunidad.set({
      id: 3,
      nombre: 'Comunidad Norte',
      codigo: 'COM-02',
      porcentajeTasaSeguridad: 0,
    } as Comunidad);
    component.form.patchValue({ latitud: -1.8021 });

    component.activeStep.set(3);
    component.save();

    expect(mockContractsApi.createContract).not.toHaveBeenCalled();
    expect(mockToastService.warning).toHaveBeenCalled();
    expect(component.coordinateError()).toBe('Ingrese latitud y longitud, o deje ambas vacías.');
  });
  it('blocks progression until customer and community are selected', () => {
    fixture.detectChanges();
    component.nextStep();
    expect(component.activeStep()).toBe(0);
    expect(component.stepAttempted()).toBe(true);
    expect(mockContractsApi.createContract).not.toHaveBeenCalled();
    component.selectedClient.set({ clienteId: '100' } as IClient);
    component.selectedComunidad.set({ id: 5 } as Comunidad);
    component.nextStep();
    expect(component.activeStep()).toBe(1);
    component.nextStep();
    expect(component.activeStep()).toBe(1);
    component.selectedMeter.set({ medidorId: 200 } as IMeter);
    component.selectedTariff.set({ categoriaTarifaId: 1 } as ITariffCategory);
    component.nextStep();
    expect(component.activeStep()).toBe(2);
    component.previousStep();
    expect(component.activeStep()).toBe(1);
    expect(component.selectedClient()?.clienteId).toBe('100');
  });

  it('shows only the active creation section and exposes its progress', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-current="step"]').textContent).toContain(
      'Cliente',
    );
    expect(fixture.nativeElement.querySelectorAll('.registration-panel')).toHaveLength(1);
    component.selectedClient.set({ clienteId: '100' } as IClient);
    component.selectedComunidad.set({ id: 5 } as Comunidad);
    component.nextStep();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-current="step"]').textContent).toContain(
      'Medidor',
    );
    expect(fixture.nativeElement.querySelectorAll('.registration-panel')).toHaveLength(1);
  });

  it('moves keyboard focus into the newly active section', async () => {
    fixture.detectChanges();
    component.selectedClient.set({ clienteId: '100' } as IClient);
    component.selectedComunidad.set({ id: 5 } as Comunidad);
    component.nextStep();
    fixture.detectChanges();
    await fixture.whenStable();
    const panel = fixture.nativeElement.querySelector('.registration-panel');
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it('should load the service area and keep its geometry for the map picker', () => {
    fixture.detectChanges();

    expect(mockContractsApi.getServiceArea).toHaveBeenCalledTimes(1);
    expect(component.serviceArea()).toEqual(mockServiceArea.geometria);
  });

  it('should leave the map picker unrestricted when the service area cannot be loaded', () => {
    mockContractsApi.getServiceArea.mockReturnValue(throwError(() => new Error('network')));

    fixture.detectChanges();

    expect(component.serviceArea()).toBeNull();
  });

  it('should pass the selected community center to the map picker as its focus point', () => {
    fixture.detectChanges();
    expect(component.communityMapCenter()).toBeNull();

    component.activeStep.set(2);
    component.onComunidadSelected({
      id: 5,
      nombre: 'Curia',
      codigo: '005',
      porcentajeTasaSeguridad: 0,
    });
    fixture.detectChanges();

    const picker = fixture.debugElement.query(By.directive(CoordinateMapPickerComponent));
    const expected = { latitud: -1.7747, longitud: -80.7643 };
    expect(component.communityMapCenter()).toEqual(expected);
    expect(picker.componentInstance.focusPoint()).toEqual(expected);

    component.onComunidadSelected({
      id: 9,
      nombre: 'Comunidad Central',
      codigo: '009',
      porcentajeTasaSeguridad: 0,
    });
    fixture.detectChanges();

    expect(picker.componentInstance.focusPoint()).toBeNull();
  });

  it('defines 4 steps including summary and confirmation', () => {
    expect(component.steps).toEqual([
      'Cliente y comunidad',
      'Medidor y tarifa',
      'Datos del contrato',
      'Resumen y confirmación',
    ]);
  });

  it('displays the summary step with client, meter and contract details', () => {
    fixture.detectChanges();
    component.selectedClient.set({
      clienteId: '100',
      identificacion: '0999999999',
      nombres: 'Juan',
      apellidos: 'Perez',
      telefono: '0999999999',
      email: 'juan@example.com',
    } as IClient);
    component.selectedComunidad.set({
      id: 5,
      codigo: 'COM-01',
      nombre: 'Comunidad Central',
      porcentajeTasaSeguridad: 0,
    });
    component.selectedMeter.set({
      medidorId: 200,
      serie: 'METER-200',
      marca: 'Actaris',
      modelo: 'A1',
    } as IMeter);
    component.selectedTariff.set({
      categoriaTarifaId: 1,
      nombre: 'Residencial',
      consumoMinimoMensual: 10,
    } as ITariffCategory);
    component.form.patchValue({
      direccionSuministro: 'Av. Las Palmas',
      lecturaInicial: '15',
    });

    component.activeStep.set(3);
    fixture.detectChanges();

    const summarySection = fixture.nativeElement.querySelector(
      'section[aria-label="Resumen y confirmación"]',
    );
    expect(summarySection).not.toBeNull();
    expect(summarySection.textContent).toContain('Juan Perez');
    expect(summarySection.textContent).toContain('Comunidad Central');
    expect(summarySection.textContent).toContain('METER-200');
    expect(summarySection.textContent).toContain('Residencial');
    expect(summarySection.textContent).toContain('METER-200-COM-01-XXXXXX (secuencial al guardar)');
    expect(summarySection.textContent).toContain('Av. Las Palmas');
  });

  it('navigates back to target step with goToStep', () => {
    component.activeStep.set(3);
    component.goToStep(0);
    expect(component.activeStep()).toBe(0);

    component.goToStep(1);
    expect(component.activeStep()).toBe(1);

    component.goToStep(2);
    expect(component.activeStep()).toBe(2);
  });

  it('advances from step 2 to step 3 when save is clicked on step 2', () => {
    fixture.detectChanges();
    component.selectedClient.set({ clienteId: '100' } as IClient);
    component.selectedComunidad.set({ id: 5 } as Comunidad);
    component.selectedMeter.set({ medidorId: 200 } as IMeter);
    component.selectedTariff.set({ categoriaTarifaId: 1 } as ITariffCategory);
    component.form.patchValue({
      direccionSuministro: 'Calle Real',
      lecturaInicial: '0',
    });
    component.activeStep.set(2);

    component.save();

    expect(component.activeStep()).toBe(3);
    expect(mockContractsApi.createContract).not.toHaveBeenCalled();
  });

  describe('previewNumeroGuia', () => {
    it('returns the existing numeroGuia in edit mode', () => {
      fixture.componentRef.setInput('contractToEdit', {
        ...mockContract,
        numeroGuia: 'METER-100-COM-01-000005',
      });
      fixture.detectChanges();

      expect(component.previewNumeroGuia()).toBe('METER-100-COM-01-000005');
    });

    it('returns predictive pattern with selected meter series and community in create mode', () => {
      fixture.componentRef.setInput('contractToEdit', null);
      component.selectedComunidad.set({ id: 1, codigo: 'COM-01' } as Comunidad);
      component.selectedMeter.set({ medidorId: 10, serie: 'MED-777' } as IMeter);
      fixture.detectChanges();

      expect(component.previewNumeroGuia()).toBe('MED-777-COM-01-XXXXXX (secuencial al guardar)');
    });

    it('uses placeholders when community or meter are not selected yet in create mode', () => {
      fixture.componentRef.setInput('contractToEdit', null);
      component.selectedComunidad.set(null);
      component.selectedMeter.set(null);
      fixture.detectChanges();

      expect(component.previewNumeroGuia()).toBe(
        '[SERIE_MEDIDOR]-[COMUNIDAD]-XXXXXX (secuencial al guardar)',
      );
    });
  });

  describe('procedure checklist and representative (SC-310)', () => {
    it('requires representative details and hides them again when the owner performs the procedure', () => {
      component.activeStep.set(2);
      fixture.detectChanges();
      component.form.get('procedure.tramitadorEsTitular')?.setValue(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#procedure-name')).toBeTruthy();
      expect(component.form.get('procedure')?.hasError('representativeRequired')).toBe(true);
      component.form.get('procedure')?.patchValue({
        tramitadorNombre: 'Ana',
        tramitadorIdentificacion: 'ABC',
        relacionTramitador: 'Familiar',
      });
      expect(component.form.get('procedure')?.valid).toBe(true);
      component.form.get('procedure.tramitadorEsTitular')?.setValue(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#procedure-name')).toBeNull();
      expect(component.form.get('procedure')?.valid).toBe(true);
    });

    it('requires Other details only when selected and clears stored notes when unchecked', () => {
      fixture.componentRef.setInput('contractToEdit', {
        ...mockContract,
        tramitadorEsTitular: false,
        tramitadorNombre: 'Ana',
        tramitadorIdentificacion: 'ABC',
        relacionTramitador: 'Familiar',
        otrasNovedades: 'Original',
        registradoPorId: 7,
      });
      component.activeStep.set(2);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#procedure-other-notes')).toBeTruthy();
      component.form.get('procedure.otrasNovedades')?.setValue('  ');
      expect(component.form.get('procedure')?.hasError('observationRequired')).toBe(true);
      const otherCheckbox = fixture.nativeElement.querySelector(
        '#procedure-other',
      ) as HTMLInputElement;
      otherCheckbox.checked = false;
      otherCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#procedure-other-notes')).toBeNull();
      mockContractsApi.updateContract.mockReturnValue(of(mockContract));
      component.save();
      expect(mockContractsApi.updateContract).toHaveBeenCalledWith(
        '10',
        expect.objectContaining({ tramitadorNombre: 'Ana', otrasNovedades: null }),
      );
      expect(mockContractsApi.updateContract.mock.calls[0][1]).not.toHaveProperty(
        'registradoPorId',
      );
    });
  });
});
