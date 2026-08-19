import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RubroPickerComponent } from './rubro-picker.component';
import { PaymentsService } from '../../../features/billing/payments/services/payments.service';
import { IRubro } from '../../../features/billing/rubros/interfaces/irubro.interface';

describe('RubroPickerComponent', () => {
  let component: RubroPickerComponent;
  let fixture: ComponentFixture<RubroPickerComponent>;
  let paymentsServiceMock: {
    getRubros: ReturnType<typeof vi.fn>;
  };

  const mockRubro: IRubro = {
    rubroId: 1,
    codigoSri: 'SRI-001',
    nombre: 'Reconexión de servicio',
    descripcion: 'Cobro por reconexión',
    precioUnitario: 15.0,
    tipoRubro: 'SERVICIO',
    tarifaImpuestoId: 1,
    activo: true,
    esAutomatico: false,
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
  };

  beforeEach(async () => {
    paymentsServiceMock = {
      getRubros: vi.fn().mockReturnValue(of({ data: [mockRubro], meta: { total: 1 } })),
    };

    await TestBed.configureTestingModule({
      imports: [RubroPickerComponent],
      providers: [{ provide: PaymentsService, useValue: paymentsServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(RubroPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the rubro picker component', () => {
    expect(component).toBeTruthy();
  });

  describe('Valid Data Scenarios', () => {
    it('should open modal and load active rubros successfully', () => {
      component.open = true;

      expect(component.open).toBe(true);
      expect(paymentsServiceMock.getRubros).toHaveBeenCalledWith(
        expect.objectContaining({ activo: true, page: 1, limit: 10 }),
      );
      expect(component.rubros().length).toBe(1);
      expect(component.rubros()[0].nombre).toBe('Reconexión de servicio');
      expect(component.isSearching()).toBe(false);
    });

    it('should emit rubroSelected event and close modal when selecting a rubro', () => {
      const selectedSpy = vi.fn();
      const closedSpy = vi.fn();
      component.rubroSelected.subscribe(selectedSpy);
      component.closed.subscribe(closedSpy);

      component.open = true;
      component.seleccionar(mockRubro);

      expect(selectedSpy).toHaveBeenCalledWith(mockRubro);
      expect(closedSpy).toHaveBeenCalled();
    });

    it('should change page and search rubros', () => {
      component.onPageChange(2);
      expect(component.currentPage()).toBe(2);
      expect(paymentsServiceMock.getRubros).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });

  describe('Invalid / Error Scenarios', () => {
    it('should handle service error gracefully and update error message', () => {
      paymentsServiceMock.getRubros.mockReturnValue(
        throwError(() => ({ error: { message: 'Error de servidor' } })),
      );

      component.open = true;

      expect(component.isSearching()).toBe(false);
      expect(component.rubros().length).toBe(0);
      expect(component.searchError()).toBe('Error de servidor');
    });

    it('should emit closed when clicking cerrar', () => {
      const spy = vi.fn();
      component.closed.subscribe(spy);

      component.cerrar();

      expect(spy).toHaveBeenCalled();
    });
  });
});
