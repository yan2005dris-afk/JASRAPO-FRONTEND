import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MetersIndexComponent } from './meters-index.component';
import { MetersApi } from '../../data/meters.api';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { of, Subject, throwError } from 'rxjs';

import { vi, Mock } from 'vitest';

// jsdom no implementa Blob.prototype.text(); los navegadores soportados sí.
if (typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function (this: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el Blob'));
      reader.readAsText(this);
    });
  };
}

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
  let toastSpy: { success: Mock; error: Mock };

  beforeEach(async () => {
    metersServiceSpy = {
      getMeterStatuses: vi.fn(),
      getMeters: vi.fn(),
      exportMeters: vi.fn(),
      createMeter: vi.fn(),
      updateMeter: vi.fn(),
      deleteMeter: vi.fn(),
    };

    toastSpy = {
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
        { provide: MetersApi, useValue: metersServiceSpy },
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

  it('debería ignorar acciones del menú que no sean un formato válido', () => {
    component.handleExportAction('xlsx');

    expect(metersServiceSpy.exportMeters).not.toHaveBeenCalled();
  });

  it('debería descargar con el nombre de archivo del backend y avisar del éxito', () => {
    const anchor = document.createElement('a');
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const createObjectURL = vi.fn().mockReturnValue('blob:medidores');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    metersServiceSpy.exportMeters.mockReturnValue(
      of(new Blob(['pdf'], { type: 'application/pdf' })),
    );

    component.exportMeters('pdf');

    const fecha = new Date().toISOString().slice(0, 10);
    expect(anchor.download).toBe(`inventario-medidores-${fecha}.pdf`);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:medidores');
    expect(toastSpy.success).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it('debería leer el mensaje del backend cuando el error llega como Blob', async () => {
    const errorBody = new Blob([JSON.stringify({ message: 'estado must be one of...' })], {
      type: 'application/json',
    });
    metersServiceSpy.exportMeters.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: errorBody, status: 400 })),
    );

    component.exportMeters('csv');

    await vi.waitFor(() =>
      expect(toastSpy.error).toHaveBeenCalledWith('estado must be one of...', 'Error'),
    );
    expect(component.isExporting).toBe(false);
  });

  it('debería usar un mensaje genérico si el cuerpo del error no es JSON', async () => {
    const errorBody = new Blob(['<html>502</html>'], { type: 'text/html' });
    metersServiceSpy.exportMeters.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: errorBody, status: 502 })),
    );

    component.exportMeters('pdf');

    await vi.waitFor(() =>
      expect(toastSpy.error).toHaveBeenCalledWith(
        'Error al exportar el inventario de medidores.',
        'Error',
      ),
    );
  });

  it('no debería lanzar una segunda exportación mientras hay una en curso', () => {
    metersServiceSpy.exportMeters.mockReturnValue(new Subject<Blob>());

    component.exportMeters('pdf');
    component.exportMeters('csv');

    expect(metersServiceSpy.exportMeters).toHaveBeenCalledTimes(1);
  });
});
