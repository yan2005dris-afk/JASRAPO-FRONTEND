import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MetersIndexComponent } from './meters-index.component';
import { MetersService } from '../../services/meters.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { of, Subject } from 'rxjs';

import { vi, Mock } from 'vitest';

describe('MetersIndexComponent', () => {
  let component: MetersIndexComponent;
  let fixture: ComponentFixture<MetersIndexComponent>;
  let metersServiceSpy: {
    getMeterStatuses: Mock;
    getMeters: Mock;
    exportMeters: Mock;
    createMeter: Mock;
    updateMeter: Mock;
    deleteMeter: Mock;
  };

  beforeEach(async () => {
    metersServiceSpy = {
      getMeterStatuses: vi.fn(),
      getMeters: vi.fn(),
      exportMeters: vi.fn(),
      createMeter: vi.fn(),
      updateMeter: vi.fn(),
      deleteMeter: vi.fn(),
    };

    const toastSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    const dialogSpy = {
      confirm: vi.fn(),
    };

    metersServiceSpy.getMeterStatuses.mockReturnValue(of([]));
    metersServiceSpy.getMeters.mockReturnValue(
      of({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          ultimaPagina: 1,
          paginaActual: 1,
          porPagina: 10,
          anterior: null,
          siguiente: null,
        },
        kpis: { enBodega: 0, instalados: 0, danados: 0, total: 0 },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [MetersIndexComponent],
      providers: [
        { provide: MetersService, useValue: metersServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: ConfirmDialogService, useValue: dialogSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MetersIndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería cargar estados al inicializar', () => {
    expect(metersServiceSpy.getMeterStatuses).toHaveBeenCalled();
    expect(component.statusCatalog).toEqual([]);
  });

  it('debería abrir el modal para registro de medidor', () => {
    component.openRegister();
    expect(component.showModal).toBeTruthy();
    expect(component.isEditMode).toBeFalsy();
    expect(component.editingMeter).toBeNull();
  });

  it('debería abrir el modal para edición de medidor', () => {
    const meterMock = {
      medidorId: 1,
      marca: 'Test',
      modelo: 'Test',
      serie: '123',
      fechaInstalacion: null,
      contratoId: null,
      latitud: null,
      longitud: null,
    };
    component.openEdit(meterMock);
    expect(component.showModal).toBeTruthy();
    expect(component.isEditMode).toBeTruthy();
    expect(component.editingMeter).toEqual(meterMock);
  });

  it('debería cerrar el modal correctamente', () => {
    component.showModal = true;
    component.closeModal();
    expect(component.showModal).toBeFalsy();
    expect(component.editingMeter).toBeNull();
  });

  it('debería exportar con los filtros actuales y finalizar la carga', () => {
    const exportSubject = new Subject<Blob>();
    metersServiceSpy.exportMeters.mockReturnValue(exportSubject);
    component.statusCatalog = [{ codigo: 'INSTALADO', nombre: 'Instalado', orden: 1 }];
    component.statusFilter = 'INSTALADO';
    component.searchQuery = '  123  ';

    component.exportMeters('pdf');

    expect(component.isExporting).toBe(true);
    expect(metersServiceSpy.exportMeters).toHaveBeenCalledWith('pdf', {
      estado: 'INSTALADO',
      search: '123',
    });

    exportSubject.next(new Blob(['pdf'], { type: 'application/pdf' }));
    exportSubject.complete();

    expect(component.isExporting).toBe(false);
  });

  it('debería iniciar la exportación al seleccionar CSV en el menú', () => {
    metersServiceSpy.exportMeters.mockReturnValue(of(new Blob(['csv'], { type: 'text/csv' })));

    component.handleExportAction('csv');

    expect(metersServiceSpy.exportMeters).toHaveBeenCalledWith('csv', {
      estado: undefined,
      search: undefined,
    });
  });
});
