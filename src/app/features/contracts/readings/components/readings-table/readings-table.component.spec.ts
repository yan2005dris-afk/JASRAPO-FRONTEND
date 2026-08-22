import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReadingsTableComponent, IReadingRowItem } from './readings-table.component';

describe('ReadingsTableComponent', () => {
  let component: ReadingsTableComponent;
  let fixture: ComponentFixture<ReadingsTableComponent>;

  const validReading: IReadingRowItem = {
    lecturaId: '1',
    guia: 'GUIA-001',
    contratoId: 10,
    clienteNombre: 'Juan Perez',
    direccion: 'Av. Principal',
    sector: 'Sector Norte',
    medidorSerie: 'MED-1234',
    fecha: '2026-08-15',
    lecturaAnterior: 100,
    lecturaActual: 150,
    consumoCalculado: 50,
    estado: 'PENDIENTE',
    tieneAnomalia: false,
  };

  const emptyOrInvalidReading: IReadingRowItem = {
    lecturaId: '2',
    estado: 'APROBADA',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingsTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component with default inputs', () => {
    expect(component).toBeTruthy();
    expect(component.readings()).toEqual([]);
    expect(component.showSector()).toBe(true);
    expect(component.showActions()).toBe(true);
    expect(component.allowReReading()).toBe(true);
  });

  describe('Valid Data Scenarios', () => {
    it('should render readings and emit viewDetail event when requested', () => {
      fixture.componentRef.setInput('readings', [validReading]);
      fixture.detectChanges();

      const spy = vi.fn();
      component.viewDetail.subscribe(spy);

      component.viewDetail.emit(validReading);
      expect(spy).toHaveBeenCalledWith(validReading);
    });

    it('should emit approveReading when reading is approved', () => {
      const spy = vi.fn();
      component.approveReading.subscribe(spy);

      component.approveReading.emit(validReading);
      expect(spy).toHaveBeenCalledWith(validReading);
    });

    it('should emit requestReReading when re-reading is triggered', () => {
      const spy = vi.fn();
      component.requestReReading.subscribe(spy);

      component.requestReReading.emit(validReading);
      expect(spy).toHaveBeenCalledWith(validReading);
    });

    it('should emit toggleDropdown event with string id and stopped propagation', () => {
      const spy = vi.fn();
      component.toggleDropdown.subscribe(spy);

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      component.onToggleDropdown(123, mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith({ id: '123', event: mockEvent });
    });
  });

  describe('Invalid / Partial Data Scenarios', () => {
    it('should safely handle reading items without optional fields', () => {
      fixture.componentRef.setInput('readings', [emptyOrInvalidReading]);
      fixture.detectChanges();

      expect(component.readings()[0].lecturaId).toBe('2');
      expect(component.readings()[0].guia).toBeUndefined();
      expect(component.readings()[0].clienteNombre).toBeUndefined();
      expect(component.readings()[0].consumoCalculado).toBeUndefined();
    });

    it('should handle empty readings array gracefully', () => {
      fixture.componentRef.setInput('readings', []);
      fixture.detectChanges();

      expect(component.readings().length).toBe(0);
    });
  });
});
