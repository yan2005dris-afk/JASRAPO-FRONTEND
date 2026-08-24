import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Mock, vi } from 'vitest';

import { ReadingsComponent } from './readings';
import { ReadingsService } from './services/readings.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';

describe('ReadingsComponent', () => {
  let component: ReadingsComponent;
  let fixture: ComponentFixture<ReadingsComponent>;
  let readingsServiceSpy: {
    getReadings: Mock;
    getReadingById: Mock;
    getReadingStates: Mock;
  };

  const emptyPage = { data: [], meta: { total: 0 } };

  const lastQuery = () =>
    readingsServiceSpy.getReadings.mock.calls[
      readingsServiceSpy.getReadings.mock.calls.length - 1
    ][0];

  beforeEach(async () => {
    vi.useFakeTimers();

    readingsServiceSpy = {
      getReadings: vi.fn().mockReturnValue(of(emptyPage)),
      getReadingById: vi.fn().mockReturnValue(of(null)),
      getReadingStates: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ReadingsComponent],
      providers: [
        { provide: ReadingsService, useValue: readingsServiceSpy },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga el listado sin filtro de búsqueda al iniciar', () => {
    expect(readingsServiceSpy.getReadings).toHaveBeenCalledTimes(1);
    expect(lastQuery()).toEqual({ page: 1, limit: 10 });
  });

  it('espera al debounce antes de consultar con el término escrito', () => {
    component.onSearchTermChange('GUIA-1-0051');

    expect(readingsServiceSpy.getReadings).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(400);

    expect(readingsServiceSpy.getReadings).toHaveBeenCalledTimes(2);
    expect(lastQuery().search).toBe('GUIA-1-0051');
  });

  it('agrupa las teclas seguidas en una sola consulta', () => {
    component.onSearchTermChange('GU');
    vi.advanceTimersByTime(200);
    component.onSearchTermChange('GUIA');
    vi.advanceTimersByTime(400);

    expect(readingsServiceSpy.getReadings).toHaveBeenCalledTimes(2);
    expect(lastQuery().search).toBe('GUIA');
  });

  it('vuelve a la primera página al buscar', () => {
    component.onPageChange(3);
    component.onSearchTermChange('María');
    vi.advanceTimersByTime(400);

    expect(component.currentPage()).toBe(1);
    expect(lastQuery().page).toBe(1);
  });

  it('aplica el filtro por estado de lectura', () => {
    component.onEstadoChange('APROBADA');

    expect(component.selectedEstado()).toBe('APROBADA');
    expect(component.currentPage()).toBe(1);
    expect(lastQuery().estado).toBe('APROBADA');
  });

  it('limpia los filtros y recarga el listado', () => {
    component.onSearchTermChange('María');
    vi.advanceTimersByTime(400);
    component.onEstadoChange('APROBADA');

    component.limpiarFiltros();

    expect(component.searchTerm()).toBe('');
    expect(component.selectedEstado()).toBe('TODOS');
    expect(lastQuery().search).toBeUndefined();
    expect(lastQuery().estado).toBeUndefined();
  });
});
