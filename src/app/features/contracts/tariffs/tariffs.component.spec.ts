import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';

import { TariffsComponent } from './tariffs.component';
import { TariffsService } from './services/tariffs.service';
import { RubrosService } from '../../billing/rubros/services/rubros.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { TableExportService } from '../../../shared/services/table-export.service';

describe('TariffsComponent', () => {
  let component: TariffsComponent;
  let fixture: ComponentFixture<TariffsComponent>;
  let tariffsServiceSpy: { getTariffs: Mock };
  let toastSpy: { show: Mock };
  let exportSpy: { exportToPdf: Mock; exportToExcel: Mock; exportToCsv: Mock };

  const page = (rows: number, total: number) => ({
    data: Array.from({ length: rows }, (_, i) => ({
      categoriaTarifaId: i + 1,
      nombre: `Tarifa ${i + 1}`,
      descripcion: 'desc',
      consumoMinimoMensual: 10,
      activo: true,
    })),
    meta: { total, page: 1, limit: 10 },
  });

  const lastQuery = () =>
    tariffsServiceSpy.getTariffs.mock.calls[tariffsServiceSpy.getTariffs.mock.calls.length - 1][0];

  beforeEach(async () => {
    vi.useFakeTimers();

    tariffsServiceSpy = { getTariffs: vi.fn().mockReturnValue(of(page(3, 3))) };
    toastSpy = { show: vi.fn() };
    exportSpy = { exportToPdf: vi.fn(), exportToExcel: vi.fn(), exportToCsv: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TariffsComponent],
      providers: [
        { provide: TariffsService, useValue: tariffsServiceSpy },
        {
          provide: RubrosService,
          useValue: { getRubros: vi.fn().mockReturnValue(of({ data: [] })) },
        },
        { provide: ToastService, useValue: toastSpy },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: TableExportService, useValue: exportSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TariffsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga la primera página al entrar, sin exigir botón Buscar', () => {
    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(1);
    expect(lastQuery()).toEqual({ page: 1, limit: 10, search: undefined });
    expect(component.tariffs()).toHaveLength(3);
  });

  it('toma el total del meta para la paginación', () => {
    tariffsServiceSpy.getTariffs.mockReturnValue(of(page(10, 42)));

    component.loadTariffs();

    expect(component.totalItems()).toBe(42);
  });

  it('espera al debounce antes de buscar en el backend', () => {
    component.onSearchTermChange('comercial');

    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(400);

    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(2);
    expect(lastQuery().search).toBe('comercial');
  });

  it('agrupa las teclas seguidas en una sola consulta', () => {
    component.onSearchTermChange('co');
    vi.advanceTimersByTime(200);
    component.onSearchTermChange('comer');
    vi.advanceTimersByTime(400);

    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(2);
    expect(lastQuery().search).toBe('comer');
  });

  it('vuelve a la primera página al buscar', () => {
    component.goToPage(3);
    component.onSearchTermChange('residencial');
    vi.advanceTimersByTime(400);

    expect(component.currentPage()).toBe(1);
    expect(lastQuery().page).toBe(1);
  });

  it('omite search cuando el término queda en blanco', () => {
    component.onSearchTermChange('   ');
    vi.advanceTimersByTime(400);

    expect(lastQuery().search).toBeUndefined();
  });

  it('pide la página al backend en vez de cortar en memoria', () => {
    component.goToPage(2);

    expect(lastQuery().page).toBe(2);
  });

  it('recarga al cambiar el tamaño de página y vuelve a la primera', () => {
    component.goToPage(4);
    component.setPageSize(20);

    expect(component.currentPage()).toBe(1);
    expect(lastQuery()).toEqual({ page: 1, limit: 20, search: undefined });
  });

  it('limpia el término y recarga', () => {
    component.onSearchTermChange('algo');
    vi.advanceTimersByTime(400);

    component.clearFilters();

    expect(component.searchTerm()).toBe('');
    expect(lastQuery().search).toBeUndefined();
  });

  it('avisa y deja la tabla vacía si falla la carga', () => {
    tariffsServiceSpy.getTariffs.mockReturnValue(throwError(() => new Error('network')));

    component.loadTariffs();

    expect(component.tariffs()).toEqual([]);
    expect(component.totalItems()).toBe(0);
    expect(component.isLoading()).toBe(false);
    expect(toastSpy.show).toHaveBeenCalled();
  });

  it('exporta el listado completo, no solo la página visible', () => {
    // 3 páginas de 50: el backend topa limit en 50.
    tariffsServiceSpy.getTariffs.mockReturnValue(of(page(50, 120)));

    component.exportToCsv();

    // 1 llamada inicial del ngOnInit + 1 primera página + 2 páginas restantes
    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(4);
    expect(exportSpy.exportToCsv).toHaveBeenCalledTimes(1);
    expect(exportSpy.exportToCsv.mock.calls[0][0].data).toHaveLength(150);
  });

  it('no pide páginas extra cuando todo entra en una', () => {
    tariffsServiceSpy.getTariffs.mockClear();
    tariffsServiceSpy.getTariffs.mockReturnValue(of(page(4, 4)));

    component.exportToPdf();

    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(1);
    expect(exportSpy.exportToPdf).toHaveBeenCalledTimes(1);
  });

  it('arrastra la búsqueda activa a la exportación', () => {
    component.onSearchTermChange('comercial');
    vi.advanceTimersByTime(400);
    tariffsServiceSpy.getTariffs.mockClear();

    component.exportToExcel();

    expect(lastQuery().search).toBe('comercial');
  });
});
