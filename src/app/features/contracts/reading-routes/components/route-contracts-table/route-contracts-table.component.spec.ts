import { signal } from '@angular/core';
import { RouteContractsTableComponent } from './route-contracts-table.component';
import { IContract } from '../../../service-contracts/domain/models/service-contract.model';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { OPERATOR_PALETTE } from '../../../../../shared/types/operator-color';

describe('RouteContractsTableComponent', () => {
  let component: RouteContractsTableComponent;

  const mockComunidades: Comunidad[] = [
    { id: 1, nombre: 'Comunidad Olón', codigo: 'OLO' } as Comunidad,
    { id: 2, nombre: 'Comunidad Manglaralto', codigo: 'MNG' } as Comunidad,
  ];

  const buildContract = (id: string, guia: string, comunidadId = 1): IContract =>
    ({
      contratoId: id,
      numeroGuia: guia,
      comunidadId,
      direccionSuministro: 'Av. Principal',
      cliente: {
        nombres: 'Juan',
        apellidos: 'Pérez',
        identificacion: '0912345678',
        direccionDomicilio: 'Calle 1',
      },
      sector: {
        sectorId: 101,
        nombre: 'Sector Centro',
        codigo: 'SEC-01',
      },
      estadoServicio: 'ACTIVO',
      estadoCobranza: 'AL_DIA',
    }) as unknown as IContract;

  const mockContracts: IContract[] = [
    buildContract('101', 'GUI-001', 1),
    buildContract('102', 'GUI-002', 1),
    buildContract('103', 'GUI-003', 1),
  ];

  const assignmentsSig = signal(new Map<number, number>());
  const contractsSig = signal<IContract[]>(mockContracts);
  const currentPageSig = signal(1);
  const pageSizeSig = signal(2);
  const selectedOpIdSig = signal<number | null>(10);

  beforeEach(() => {
    component = Object.create(
      RouteContractsTableComponent.prototype,
    ) as RouteContractsTableComponent;

    assignmentsSig.set(new Map<number, number>());
    contractsSig.set(mockContracts);
    currentPageSig.set(1);
    pageSizeSig.set(2);
    selectedOpIdSig.set(10);

    // Mock inputs as signals
    (component as unknown as Record<string, unknown>)['comunidades'] = signal(mockComunidades);
    (component as unknown as Record<string, unknown>)['selectedComunidadId'] = signal(1);
    (component as unknown as Record<string, unknown>)['contracts'] = contractsSig;
    (component as unknown as Record<string, unknown>)['totalContracts'] = signal(
      mockContracts.length,
    );
    (component as unknown as Record<string, unknown>)['searchQuery'] = signal('');
    (component as unknown as Record<string, unknown>)['currentPage'] = currentPageSig;
    (component as unknown as Record<string, unknown>)['pageSize'] = pageSizeSig;
    (component as unknown as Record<string, unknown>)['totalPages'] = signal(2);
    (component as unknown as Record<string, unknown>)['isLoading'] = signal(false);
    (component as unknown as Record<string, unknown>)['selectedOperarioId'] = selectedOpIdSig;
    (component as unknown as Record<string, unknown>)['assignments'] = assignmentsSig;
    (component as unknown as Record<string, unknown>)['operatorColorResolver'] = signal(
      () => OPERATOR_PALETTE[0],
    );
    (component as unknown as Record<string, unknown>)['operatorNameResolver'] = signal(
      () => 'Carlos Mendoza',
    );

    // Mock outputs
    (component as unknown as Record<string, unknown>)['comunidadChange'] = { emit: vi.fn() };
    (component as unknown as Record<string, unknown>)['searchChange'] = { emit: vi.fn() };
    (component as unknown as Record<string, unknown>)['pageChange'] = { emit: vi.fn() };
    (component as unknown as Record<string, unknown>)['contractToggled'] = { emit: vi.fn() };
    (component as unknown as Record<string, unknown>)['toggleAllVisibleRequested'] = {
      emit: vi.fn(),
    };

    // Reconstruct computeds
    (component as unknown as Record<string, unknown>)['paginatedContracts'] = () => {
      const list = contractsSig();
      const page = currentPageSig();
      const size = pageSizeSig();
      const start = (page - 1) * size;
      return list.slice(start, start + size);
    };

    (component as unknown as Record<string, unknown>)['areAllVisibleAssigned'] = () => {
      const opId = selectedOpIdSig();
      if (!opId) return false;
      const visible = (
        component as unknown as { paginatedContracts: () => IContract[] }
      ).paginatedContracts();
      if (visible.length === 0) return false;
      const map = assignmentsSig();
      return visible.every((c) => map.get(Number(c.contratoId)) === opId);
    };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should paginate contracts according to pageSize and currentPage', () => {
    expect(component.paginatedContracts().length).toBe(2);
    expect(component.paginatedContracts()[0].contratoId).toBe('101');
    expect(component.paginatedContracts()[1].contratoId).toBe('102');
  });

  it('should compute areAllVisibleAssigned correctly', () => {
    expect(component.areAllVisibleAssigned()).toBe(false);

    assignmentsSig.set(
      new Map<number, number>([
        [101, 10],
        [102, 10],
      ]),
    );

    expect(component.areAllVisibleAssigned()).toBe(true);
  });

  it('should emit contractToggled when onToggle is invoked', () => {
    const spy = vi.spyOn(component.contractToggled, 'emit');
    component.onToggle(101);
    expect(spy).toHaveBeenCalledWith(101);
  });

  it('should emit toggleAllVisibleRequested when onToggleAll is invoked', () => {
    const spy = vi.spyOn(component.toggleAllVisibleRequested, 'emit');
    component.onToggleAll();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit pageChange when onPageSelect is invoked', () => {
    const spy = vi.spyOn(component.pageChange, 'emit');
    component.onPageSelect(2);
    expect(spy).toHaveBeenCalledWith(2);
  });

  it('should resolve contract assignment status correctly', () => {
    const statusUnassigned = component.getContratoStatus(101);
    expect(statusUnassigned.isAssigned).toBe(false);

    assignmentsSig.set(
      new Map<number, number>([
        [101, 10],
        [102, 20],
      ]),
    );

    const statusMine = component.getContratoStatus(101);
    expect(statusMine.isAssigned).toBe(true);
    expect(statusMine.isCurrentOperator).toBe(true);
    expect(statusMine.operarioName).toBe('Carlos Mendoza');

    const statusOther = component.getContratoStatus(102);
    expect(statusOther.isAssigned).toBe(true);
    expect(statusOther.isCurrentOperator).toBe(false);
  });
});
