import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Mock, vi } from 'vitest';

import { PaymentAgreementsComponent } from './payment-agreements';
import { PaymentAgreementsApi } from './data/payment-agreements.api';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TableExportService } from '../../../shared/services/table-export.service';

describe('PaymentAgreementsComponent', () => {
  let component: PaymentAgreementsComponent;
  let fixture: ComponentFixture<PaymentAgreementsComponent>;
  let agreementsServiceSpy: {
    getAgreements: Mock;
    getAgreementById: Mock;
    getAgreementPdf: Mock;
  };

  const emptyPage = { data: [], meta: { totalItems: 0 } };

  const lastQuery = () =>
    agreementsServiceSpy.getAgreements.mock.calls[
      agreementsServiceSpy.getAgreements.mock.calls.length - 1
    ][0];

  beforeEach(async () => {
    vi.useFakeTimers();

    agreementsServiceSpy = {
      getAgreements: vi.fn().mockReturnValue(of(emptyPage)),
      getAgreementById: vi.fn().mockReturnValue(of(null)),
      getAgreementPdf: vi.fn().mockReturnValue(of(new Blob())),
    };

    await TestBed.configureTestingModule({
      imports: [PaymentAgreementsComponent],
      providers: [
        { provide: PaymentAgreementsApi, useValue: agreementsServiceSpy },
        { provide: ToastService, useValue: { show: vi.fn() } },
        {
          provide: TableExportService,
          useValue: { exportToPdf: vi.fn(), exportToExcel: vi.fn(), exportToCsv: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentAgreementsComponent);
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
    expect(agreementsServiceSpy.getAgreements).toHaveBeenCalledTimes(1);
    expect(lastQuery()).toEqual({ page: 1, limit: 10 });
  });

  it('espera al debounce antes de consultar con el término escrito', () => {
    component.onSearchTermChange('GUIA-1-0051');

    expect(agreementsServiceSpy.getAgreements).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(400);

    expect(agreementsServiceSpy.getAgreements).toHaveBeenCalledTimes(2);
    expect(lastQuery().search).toBe('GUIA-1-0051');
  });

  it('agrupa las teclas seguidas en una sola consulta', () => {
    component.onSearchTermChange('GU');
    vi.advanceTimersByTime(200);
    component.onSearchTermChange('GUIA');
    vi.advanceTimersByTime(400);

    expect(agreementsServiceSpy.getAgreements).toHaveBeenCalledTimes(2);
    expect(lastQuery().search).toBe('GUIA');
  });

  it('vuelve a la primera página al buscar', () => {
    component.onPageChange(3);
    component.onSearchTermChange('María');
    vi.advanceTimersByTime(400);

    expect(component.currentPage()).toBe(1);
    expect(lastQuery().page).toBe(1);
  });

  it('omite el parámetro search cuando el término queda vacío', () => {
    component.onSearchTermChange('   ');
    vi.advanceTimersByTime(400);

    expect(lastQuery().search).toBeUndefined();
  });

  it('limpia el término y recarga el listado', () => {
    component.onSearchTermChange('María');
    vi.advanceTimersByTime(400);

    component.limpiarFiltros();

    expect(component.searchTerm()).toBe('');
    expect(component.selectedEstado()).toBe('TODOS');
    expect(lastQuery().search).toBeUndefined();
    expect(lastQuery().estado).toBeUndefined();
  });

  it('aplica el filtro por estado del convenio', () => {
    component.onEstadoChange('ACTIVO');

    expect(component.selectedEstado()).toBe('ACTIVO');
    expect(component.currentPage()).toBe(1);
    expect(lastQuery().estado).toBe('ACTIVO');
  });
});
