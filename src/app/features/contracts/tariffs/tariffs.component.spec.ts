import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';

import { TariffsComponent } from './tariffs.component';
import { TariffsApi } from './data/tariffs.api';
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
    tariffsServiceSpy = { getTariffs: vi.fn().mockReturnValue(of(page(3, 3))) };
    toastSpy = { show: vi.fn() };
    exportSpy = { exportToPdf: vi.fn(), exportToExcel: vi.fn(), exportToCsv: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TariffsComponent],
      providers: [
        { provide: TariffsApi, useValue: tariffsServiceSpy },
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

  it('no consulta mientras se escribe el término de búsqueda', () => {
    component.onSearchTermChange('comercial');

    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(1);
    expect(component.searchTerm()).toBe('comercial');
    expect(component.appliedSearchTerm()).toBe('');
  });

  it('consulta una sola vez al aplicar la búsqueda', () => {
    component.onSearchTermChange(' comercial ');
    component.applySearch();

    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(2);
    expect(lastQuery().search).toBe('comercial');
    expect(component.appliedSearchTerm()).toBe('comercial');
  });

  it('consulta al presionar Enter en el campo de búsqueda', () => {
    const input = fixture.nativeElement.querySelector(
      'input[aria-label="Buscar tarifas por nombre o descripción"]',
    ) as HTMLInputElement;
    input.value = 'comercial';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));

    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(2);
    expect(lastQuery().search).toBe('comercial');
  });

  it('consulta al hacer clic en el botón Buscar', () => {
    component.onSearchTermChange('comercial');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Buscar tarifas"]',
    ) as HTMLButtonElement;
    button.click();

    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(2);
    expect(lastQuery().search).toBe('comercial');
  });

  it('vuelve a la primera página al buscar', () => {
    component.goToPage(3);
    component.onSearchTermChange('residencial');
    component.applySearch();

    expect(component.currentPage()).toBe(1);
    expect(lastQuery().page).toBe(1);
  });

  it('omite search cuando el término queda en blanco', () => {
    component.onSearchTermChange('   ');
    component.applySearch();

    expect(lastQuery().search).toBeUndefined();
  });

  it('usa el término aplicado al pedir otra página', () => {
    component.onSearchTermChange('comercial');
    component.applySearch();

    component.goToPage(2);

    expect(lastQuery()).toEqual({ page: 2, limit: 10, search: 'comercial' });
  });

  it('recarga al cambiar el tamaño de página y vuelve a la primera', () => {
    component.goToPage(4);
    component.setPageSize(20);

    expect(component.currentPage()).toBe(1);
    expect(lastQuery()).toEqual({ page: 1, limit: 20, search: undefined });
  });

  it('limpia el término y recarga', () => {
    component.onSearchTermChange('algo');
    component.applySearch();
    tariffsServiceSpy.getTariffs.mockClear();

    component.clearFilters();

    expect(component.searchTerm()).toBe('');
    expect(component.appliedSearchTerm()).toBe('');
    expect(tariffsServiceSpy.getTariffs).toHaveBeenCalledTimes(1);
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
    component.applySearch();
    tariffsServiceSpy.getTariffs.mockClear();

    component.exportToExcel();

    expect(lastQuery().search).toBe('comercial');
  });
});
