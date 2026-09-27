import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MeterTableComponent } from './meter-table.component';
import { IMeter } from '../../../features/contracts/meters/interfaces/imeter.interface';

describe('MeterTableComponent', () => {
  let component: MeterTableComponent;
  let fixture: ComponentFixture<MeterTableComponent>;

  const mockMeters: IMeter[] = [
    {
      medidorId: 1,
      serie: 'MED-001',
      marca: 'Itron',
      modelo: 'CX1000',
      estado: { codigo: 'BODEGA', nombre: 'Bodega', orden: 1 },
      fechaInstalacion: null,
      contratoId: null,
    },
    {
      medidorId: 2,
      serie: 'MED-002',
      marca: 'Siemens',
      modelo: 'Digital',
      estado: { codigo: 'INSTALADO', nombre: 'Instalado', orden: 2 },
      fechaInstalacion: '2026-01-01',
      contratoId: '10',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeterTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MeterTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('meters', mockMeters);
    fixture.detectChanges();
  });

  it('should create and render meters', () => {
    expect(component).toBeTruthy();
    expect(component.isSelected(mockMeters[0])).toBe(false);
    expect(component.getStatusCode(mockMeters[0])).toBe('BODEGA');
    expect(component.getStatusLabel(mockMeters[0])).toBe('Bodega');
  });

  it('should identify selected meter', () => {
    fixture.componentRef.setInput('selectedMeterId', '1');
    fixture.detectChanges();
    expect(component.isSelected(mockMeters[0])).toBe(true);
    expect(component.isSelected(mockMeters[1])).toBe(false);
  });

  it('should emit meterSelected when select is called', () => {
    const spy = vi.spyOn(component.meterSelected, 'emit');
    component.select(mockMeters[0]);
    expect(spy).toHaveBeenCalledWith(mockMeters[0]);
  });

  it('should emit pageChange and pageSizeChange', () => {
    const pageSpy = vi.spyOn(component.pageChange, 'emit');
    const sizeSpy = vi.spyOn(component.pageSizeChange, 'emit');

    component.onPageChange(2);
    component.onPageSizeChange(20);

    expect(pageSpy).toHaveBeenCalledWith(2);
    expect(sizeSpy).toHaveBeenCalledWith(20);
  });
});
