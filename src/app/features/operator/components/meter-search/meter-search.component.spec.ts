import { TestBed } from '@angular/core/testing';
import { MeterSearchComponent } from './meter-search.component';
import { IMeterDto } from '../../../contracts/meters/interfaces/imeter.interface';
import { MeterGroup } from '../../readings/readings.models';

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
      latitud: null,
      longitud: null,
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
      latitud: null,
      longitud: null,
    },
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

  it('emits meterSelected on selection', () => {
    const fixture = TestBed.createComponent(MeterSearchComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('groups', mockGroups);
    fixture.detectChanges();

    const selected: IMeterDto[] = [];
    comp.meterSelected.subscribe((m) => selected.push(m));

    comp.meterSelected.emit(mockMeters[0]);
    expect(selected).toHaveLength(1);
    expect(selected[0].serie).toBe('SER-001');
  });
});
