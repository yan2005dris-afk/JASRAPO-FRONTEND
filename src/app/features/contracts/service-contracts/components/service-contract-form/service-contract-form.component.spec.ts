import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ServiceContractFormComponent } from './service-contract-form.component';
import { ContractsService } from '../../services/contracts.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { IContract } from '../../interfaces/icontract.interface';
import { IMeter } from '../../../meters/interfaces/imeter.interface';
import { IClient } from '../../../clients/interfaces/iclients.interface';
import { ITariffCategory } from '../../../tariffs/interfaces/itariff.interface';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';

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
    estado: 'ACTIVO',
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

  const mockContractsService = {
    createContract: vi.fn(),
    updateContract: vi.fn(),
    getContractById: vi.fn(),
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ServiceContractFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ContractsService, useValue: mockContractsService },
        { provide: ToastService, useValue: mockToastService },
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
    expect(component.form.get('numeroGuia')?.value).toBe('CTR-001');
    expect(component.form.get('direccionSuministro')?.value).toBe('Calle Principal 123');
    expect(component.form.get('estado')?.value).toBe('ACTIVO');
    expect(component.selectedClient()?.identificacion).toBe('0999999999');
    expect(component.selectedMeter()?.serie).toBe('METER-200');
  });

  it('should send only contractual fields without medidorId in updateContract payload', () => {
    fixture.componentRef.setInput('contractToEdit', mockContract);
    fixture.detectChanges();

    mockContractsService.updateContract.mockReturnValue(of(mockContract));
    const savedEmitSpy = vi.spyOn(component.saved, 'emit');

    component.form.patchValue({
      direccionSuministro: 'Nueva Direccion 456',
      estado: 'SUSPENDIDO',
    });

    component.save();

    expect(mockContractsService.updateContract).toHaveBeenCalledWith('10', {
      estado: 'SUSPENDIDO',
      direccionSuministro: 'Nueva Direccion 456',
      clienteId: '100',
      comunidadId: '5',
      categoriaTarifaId: '1',
    });
    expect(
      (mockContractsService.updateContract.mock.calls[0][1] as unknown as Record<string, unknown>)[
        'medidorId'
      ],
    ).toBeUndefined();
    expect(
      (mockContractsService.updateContract.mock.calls[0][1] as unknown as Record<string, unknown>)[
        'lecturaInicial'
      ],
    ).toBeUndefined();
    expect(savedEmitSpy).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith(
      'Contrato actualizado correctamente',
      'Éxito',
    );
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

    mockContractsService.getContractById.mockReturnValue(of(updatedContract));
    const savedEmitSpy = vi.spyOn(component.saved, 'emit');

    component.openReplaceMeterModal();
    component.onMeterReplaced();

    expect(component.isReplaceMeterModalOpen()).toBeFalsy();
    expect(mockContractsService.getContractById).toHaveBeenCalledWith('10');
    expect(component.selectedMeter()?.serie).toBe('METER-300');
    expect(savedEmitSpy).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith(
      'Medidor reemplazado correctamente',
      'Éxito',
    );
  });

  it('should create contract with medidorId and lecturaInicial in create mode', () => {
    fixture.detectChanges();

    mockContractsService.createContract.mockReturnValue(of(mockContract));
    const savedEmitSpy = vi.spyOn(component.saved, 'emit');

    component.form.patchValue({
      numeroGuia: 'CTR-NEW-01',
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

    component.save();

    expect(mockContractsService.createContract).toHaveBeenCalledWith({
      clienteId: '101',
      categoriaTarifaId: '2',
      medidorId: '500',
      numeroGuia: 'CTR-NEW-01',
      direccionSuministro: 'Calle Nueva 789',
      comunidadId: '3',
      lecturaInicial: 0,
    });
    expect(savedEmitSpy).toHaveBeenCalled();
  });
});
