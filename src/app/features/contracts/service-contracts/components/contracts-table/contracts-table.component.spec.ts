import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractsTableComponent } from './contracts-table.component';
import type { IContract } from '../../interfaces/icontract.interface';

describe('ContractsTableComponent', () => {
  let component: ContractsTableComponent;
  let fixture: ComponentFixture<ContractsTableComponent>;

  const dummyContract: IContract = {
    contratoId: '101',
    numeroGuia: 'GUIA-001',
    estado: 'ACTIVO',
    clienteId: '1',
    direccionSuministro: 'Calle Principal',
    fechaInicio: '2025-01-01',
    categoriaTarifaId: 1,
    comunidadId: 1,
    sectorId: 1,
    categoriaTarifa: {
      categoriaTarifaId: 1,
      nombre: 'Residencial',
      descripcion: 'Tarifa básica',
      valorBase: 5,
      consumoMinimoMensual: 10,
      valorExcedenteM3: 0.5,
    },
    comunidad: {
      comunidadId: 1,
      codigo: 'COM-01',
      nombre: 'Centro',
    },
    sector: {
      sectorId: 1,
      codigo: 'SEC-01',
      nombre: 'Sector Norte',
    },
    historialMedidores: [],
    cliente: {
      clienteId: '1',
      identificacion: '0999999999',
      nombres: 'Juan',
      apellidos: 'Pérez',
      razonSocial: null,
      email: 'juan@example.com',
      telefono: '0999999999',
      direccionDomicilio: 'Calle Principal',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractsTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('contracts', [dummyContract]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emite contractSelected al hacer click en fila en modo select', () => {
    fixture.componentRef.setInput('mode', 'select');
    fixture.detectChanges();

    let selected: IContract | undefined;
    component.contractSelected.subscribe((c) => (selected = c));

    component.onRowClick(dummyContract);
    expect(selected).toBe(dummyContract);
  });

  it('emite contractDoubleClicked al hacer doble click en modo select', () => {
    fixture.componentRef.setInput('mode', 'select');
    fixture.detectChanges();

    let dblClicked: IContract | undefined;
    component.contractDoubleClicked.subscribe((c) => (dblClicked = c));

    component.onRowDoubleClick(dummyContract);
    expect(dblClicked).toBe(dummyContract);
  });

  it('emite edit al presionar editar en modo manage', () => {
    fixture.componentRef.setInput('mode', 'manage');
    fixture.detectChanges();

    let edited: IContract | undefined;
    component.edit.subscribe((c) => (edited = c));

    const mockEvent = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    component.onEditClick(dummyContract, mockEvent);
    expect(edited).toBe(dummyContract);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('only enables installation planning from estadoServicio', () => {
    expect(
      component.canAssignInstallationRoute({ ...dummyContract, estado: 'PENDIENTE_INSTALACION' }),
    ).toBe(false);
    expect(
      component.canAssignInstallationRoute({
        ...dummyContract,
        estadoServicio: 'PENDIENTE_INSTALACION',
      }),
    ).toBe(true);
  });
});
