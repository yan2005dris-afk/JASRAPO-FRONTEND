import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PeriodPickerComponent } from './period-picker.component';
import { IAccountingPeriod, PeriodsService } from '../../services/periods.service';

describe('PeriodPickerComponent', () => {
  let component: PeriodPickerComponent;
  let fixture: ComponentFixture<PeriodPickerComponent>;
  let periodsServiceMock: {
    getPeriods: ReturnType<typeof vi.fn>;
  };

  const mockPeriods: IAccountingPeriod[] = [
    { periodoId: 1, nombre: 'Enero 2026', estado: 'CERRADO' },
    { periodoId: 2, nombre: 'Febrero 2026', estado: 'ABIERTO' },
    { periodoId: 3, nombre: 'Marzo 2026', estado: 'CERRADO' },
  ];

  beforeEach(async () => {
    periodsServiceMock = {
      getPeriods: vi.fn().mockReturnValue(of(mockPeriods)),
    };

    await TestBed.configureTestingModule({
      imports: [PeriodPickerComponent],
      providers: [{ provide: PeriodsService, useValue: periodsServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(PeriodPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the period picker component', () => {
    expect(component).toBeTruthy();
  });

  describe('Periods Loading', () => {
    it('should load periods from service on construction', () => {
      expect(periodsServiceMock.getPeriods).toHaveBeenCalledTimes(1);
      expect(component.periods().length).toBe(3);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle service error gracefully', () => {
      periodsServiceMock.getPeriods.mockReturnValue(
        throwError(() => ({ error: { message: 'Error de servidor' } })),
      );

      const errorFixture = TestBed.createComponent(PeriodPickerComponent);
      errorFixture.detectChanges();

      expect(errorFixture.componentInstance.periods().length).toBe(0);
      expect(errorFixture.componentInstance.isLoading()).toBe(false);
    });
  });

  describe('Selection Sync from Input', () => {
    it('should sync currentSelected when selectedPeriodId matches a loaded period', () => {
      fixture.componentRef.setInput('selectedPeriodId', 2);
      fixture.detectChanges();

      expect(component.currentSelected()?.periodoId).toBe(2);
      expect(component.currentSelected()?.nombre).toBe('Febrero 2026');
      expect(component.searchQuery()).toBe('Febrero 2026');
    });

    it('should clear currentSelected when selectedPeriodId is null', () => {
      fixture.componentRef.setInput('selectedPeriodId', 2);
      fixture.detectChanges();
      expect(component.currentSelected()?.periodoId).toBe(2);

      fixture.componentRef.setInput('selectedPeriodId', null);
      fixture.detectChanges();

      expect(component.currentSelected()).toBeNull();
    });

    it('should not override currentSelected when selectedPeriodId matches the already-selected period', () => {
      // La idea: si el padre sincroniza el mismo valor que el usuario ya seleccionó,
      // no debemos pisar el estado ni emitir.
      const selectedSpy = vi.fn();
      component.periodSelected.subscribe(selectedSpy);

      fixture.componentRef.setInput('selectedPeriodId', 2);
      fixture.detectChanges();
      expect(selectedSpy).not.toHaveBeenCalled();
    });
  });

  describe('User Selection', () => {
    it('should emit periodSelected when user selects a period', () => {
      const selectedSpy = vi.fn();
      component.periodSelected.subscribe(selectedSpy);

      component.selectPeriod(mockPeriods[1]);

      expect(selectedSpy).toHaveBeenCalledWith(mockPeriods[1]);
      expect(component.currentSelected()?.periodoId).toBe(2);
      expect(component.isOpen()).toBe(false);
    });

    it('should not emit when selectPeriod is called with emit=false', () => {
      const selectedSpy = vi.fn();
      component.periodSelected.subscribe(selectedSpy);

      component.selectPeriod(mockPeriods[0], false);

      expect(selectedSpy).not.toHaveBeenCalled();
      expect(component.currentSelected()?.periodoId).toBe(1);
    });

    it('should emit null when clearSelection is called', () => {
      const selectedSpy = vi.fn();
      component.periodSelected.subscribe(selectedSpy);

      // Pre-selección
      fixture.componentRef.setInput('selectedPeriodId', 1);
      fixture.detectChanges();
      selectedSpy.mockClear();

      component.clearSelection();

      expect(selectedSpy).toHaveBeenCalledWith(null);
      expect(component.currentSelected()).toBeNull();
      expect(component.searchQuery()).toBe('');
      expect(component.isOpen()).toBe(false);
    });
  });

  describe('Filtering', () => {
    it('should filter periods by nombre', () => {
      component.onQueryChange('febrero');
      expect(component.filteredPeriods().length).toBe(1);
      expect(component.filteredPeriods()[0].periodoId).toBe(2);
    });

    it('should filter periods by periodoId', () => {
      component.onQueryChange('3');
      expect(component.filteredPeriods().length).toBe(1);
      expect(component.filteredPeriods()[0].periodoId).toBe(3);
    });

    it('should filter periods by estado', () => {
      component.onQueryChange('abierto');
      expect(component.filteredPeriods().length).toBe(1);
      expect(component.filteredPeriods()[0].periodoId).toBe(2);
    });

    it('should return all periods when searchQuery is empty', () => {
      component.onQueryChange('   ');
      expect(component.filteredPeriods().length).toBe(3);
    });
  });

  describe('Estado Badge', () => {
    it('should return success class for ABIERTO', () => {
      expect(component.getEstadoBadgeClass('ABIERTO')).toContain('success');
    });

    it('should return success class for ACTIVO', () => {
      expect(component.getEstadoBadgeClass('ACTIVO')).toContain('success');
    });

    it('should return secondary class for CERRADO', () => {
      expect(component.getEstadoBadgeClass('CERRADO')).toContain('secondary');
    });

    it('should return light class for unknown estado', () => {
      expect(component.getEstadoBadgeClass('DESCONOCIDO')).toContain('light');
    });
  });
});
