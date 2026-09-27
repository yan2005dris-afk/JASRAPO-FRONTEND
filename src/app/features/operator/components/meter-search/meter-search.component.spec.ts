import { TestBed } from '@angular/core/testing';
import { MeterSearchComponent } from './meter-search.component';
import { IMeterDto } from '../../../contracts/meters/interfaces/imeter.interface';
import { EstadoChip, MeterGroup } from '../../readings/readings.models';

describe('MeterSearchComponent', () => {
  const mockMeters: IMeterDto[] = [
    {
      medidorId: 1,
      serie: 'SER-001',
      marca: 'MarcaA',
      modelo: 'ModA',
      estado: 'ACTIVO',
      contratoId: 'CONT-1',
      clienteNombre: 'Juan Perez',
      fechaInstalacion: '2026-01-01',
    },
    {
      medidorId: 2,
      serie: 'SER-002',
      marca: 'MarcaB',
      modelo: 'ModB',
      estado: 'ACTIVO',
      contratoId: 'CONT-2',
      clienteNombre: 'Maria Lopez',
      fechaInstalacion: '2026-01-01',
    },
  ];

  const mockFilterChips: EstadoChip[] = [
    { value: 'todas', label: 'Todas', icon: 'bi-grid' },
    { value: 'PENDIENTE', label: 'Pendiente', icon: 'bi-clock' },
  ];

  const mockGroups: MeterGroup[] = [
    {
      estado: 'PENDIENTE',
      info: { label: 'Pendiente', icon: 'bi-clock', cssClass: 'badge-pendiente' },
      meters: mockMeters,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MeterSearchComponent],
    });
  });

  it('filters meters by serie and client name', () => {
    const fixture = TestBed.createComponent(MeterSearchComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('groups', mockGroups);
    fixture.detectChanges();

    expect(comp.filteredItems().length).toBe(2);

    comp.onSearchChange('SER-001');
    expect(comp.filteredItems().length).toBe(1);
    expect(comp.filteredItems()[0].meter.serie).toBe('SER-001');

    comp.onSearchChange('Maria');
    expect(comp.filteredItems().length).toBe(1);
    expect(comp.filteredItems()[0].meter.clienteNombre).toBe('Maria Lopez');

    comp.onSearchChange('INEXISTENTE');
    expect(comp.filteredItems().length).toBe(0);
  });

  it('renders the search box, filters, and meter cards from the inputs', () => {
    const fixture = TestBed.createComponent(MeterSearchComponent);
    fixture.componentRef.setInput('groups', mockGroups);
    fixture.componentRef.setInput('filterChips', mockFilterChips);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.search-input')).not.toBeNull();
    expect(element.querySelectorAll('.filter-chip')).toHaveLength(2);
    expect(element.querySelector('.meters-virtual-viewport')).not.toBeNull();
    expect(fixture.componentInstance.filteredItems()).toHaveLength(2);
  });

  it('updates the selected filter and emits filter changes', () => {
    const fixture = TestBed.createComponent(MeterSearchComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('groups', mockGroups);
    fixture.componentRef.setInput('filterChips', mockFilterChips);
    fixture.detectChanges();

    const filters: string[] = [];
    comp.filterChange.subscribe((filter) => filters.push(filter));
    const pendingChip = fixture.nativeElement.querySelectorAll(
      '.filter-chip',
    )[1] as HTMLButtonElement;
    pendingChip.click();
    fixture.detectChanges();

    expect(comp.selectedEstadoFilter()).toBe('PENDIENTE');
    expect(filters).toEqual(['PENDIENTE']);
    expect(comp.filteredItems()).toHaveLength(2);
  });

  it('renders loading and empty states', () => {
    const fixture = TestBed.createComponent(MeterSearchComponent);
    fixture.componentRef.setInput('groups', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No hay medidores cargados.');

    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.loading-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
  });

  it('propagates a meter card selection through meterSelected', () => {
    const fixture = TestBed.createComponent(MeterSearchComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('groups', mockGroups);
    fixture.detectChanges();

    const selected: IMeterDto[] = [];
    comp.meterSelected.subscribe((meter) => selected.push(meter));
    comp.onMeterSelect(mockMeters[0]);

    expect(selected).toEqual([mockMeters[0]]);
  });
});
