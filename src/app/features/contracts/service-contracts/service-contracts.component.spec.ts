import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Mock, vi } from 'vitest';

import { ContractsService } from './services/contracts.service';
import { ServiceContractsComponent } from './service-contracts.component';

describe('ServiceContractsComponent', () => {
  let component: ServiceContractsComponent;
  let fixture: ComponentFixture<ServiceContractsComponent>;
  let contractsServiceMock: {
    getContractStates: Mock;
    getContracts: Mock;
  };

  beforeEach(async () => {
    contractsServiceMock = {
      getContractStates: vi.fn(),
      getContracts: vi.fn(),
    };
    contractsServiceMock.getContractStates.mockReturnValue(of([]));
    contractsServiceMock.getContracts.mockReturnValue(of({ data: [], meta: { total: 0 } }));

    await TestBed.configureTestingModule({
      imports: [ServiceContractsComponent],
      providers: [{ provide: ContractsService, useValue: contractsServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceContractsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads only the service state filter independently', () => {
    component.estadoServicioFilter.set('ACTIVO');

    component.loadContracts();

    expect(contractsServiceMock.getContracts).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      estadoServicio: 'ACTIVO',
    });
  });

  it('sends global search together with the selected state filters', () => {
    component.searchTerm.set('tarifa residencial');
    component.estadoServicioFilter.set('ACTIVO');
    component.estadoCobranzaFilter.set('EN_MORA');

    component.loadContracts();

    expect(contractsServiceMock.getContracts).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: 'tarifa residencial',
      estadoServicio: 'ACTIVO',
      estadoCobranza: 'EN_MORA',
    });
  });

  it('loads only the collection state filter independently', () => {
    component.estadoCobranzaFilter.set('EN_MORA');

    component.loadContracts();

    expect(contractsServiceMock.getContracts).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      estadoCobranza: 'EN_MORA',
    });
  });

  it('loads the NO_APLICA collection state filter independently', () => {
    component.estadoCobranzaFilter.set('NO_APLICA');

    component.loadContracts();

    expect(contractsServiceMock.getContracts).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      estadoCobranza: 'NO_APLICA',
    });
  });

  it('loads both state filters without the legacy estado parameter', () => {
    component.estadoServicioFilter.set('SUSPENDIDO');
    component.estadoCobranzaFilter.set('AL_DIA');

    component.loadContracts();

    expect(contractsServiceMock.getContracts).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      estadoServicio: 'SUSPENDIDO',
      estadoCobranza: 'AL_DIA',
    });
  });

  it('resets both state filters and preserves the initial empty state', () => {
    component.estadoServicioFilter.set('ACTIVO');
    component.estadoCobranzaFilter.set('EN_MORA');
    component.searchTerm.set('guide');
    component.hasFetched.set(true);

    component.limpiarBusqueda();

    expect(component.estadoServicioFilter()).toBe('');
    expect(component.estadoCobranzaFilter()).toBe('');
    expect(component.searchTerm()).toBe('');
    expect(component.hasFetched()).toBe(false);
  });

  it('renders separate human-readable service and collection state options', () => {
    fixture.detectChanges();

    const serviceFilter = fixture.nativeElement.querySelector('#estadoServicioFilter');
    const collectionFilter = fixture.nativeElement.querySelector('#estadoCobranzaFilter');

    expect(serviceFilter.options[0].text).toBe('Todos');
    expect(collectionFilter.options[0].text).toBe('Todos');
    expect(
      Array.from<HTMLOptionElement>(serviceFilter.options).map((option) => option.value),
    ).toEqual(['', 'PENDIENTE_PAGO', 'PENDIENTE_INSTALACION', 'ACTIVO', 'SUSPENDIDO', 'RETIRADO']);
    expect(
      Array.from<HTMLOptionElement>(collectionFilter.options).map((option) => option.value),
    ).toEqual(['', 'NO_APLICA', 'AL_DIA', 'EN_MORA']);
    expect(collectionFilter.options[1].text).toBe('No aplica');

    expect(
      fixture.nativeElement.querySelector('label[for="contractSearch"]').textContent.trim(),
    ).toBe('Buscar contratos');
    expect(
      fixture.nativeElement.querySelector('label[for="estadoServicioFilter"]').textContent.trim(),
    ).toBe('Estado del servicio');
    expect(
      fixture.nativeElement.querySelector('label[for="estadoCobranzaFilter"]').textContent.trim(),
    ).toBe('Estado de cobranza');
    expect(fixture.nativeElement.querySelector('#contractSearch').placeholder).toBe(
      'Guía, cliente, tarifa...',
    );
    expect(fixture.nativeElement.querySelectorAll('.contract-filter-control select')).toHaveLength(
      2,
    );
    expect(
      fixture.nativeElement
        .querySelector('#contractSearch')
        .closest('.search-group')
        .classList.contains('search-group'),
    ).toBe(true);
    expect(serviceFilter.classList.contains('filter-select')).toBe(true);
    expect(collectionFilter.classList.contains('filter-select')).toBe(true);
  });
});
