import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ZoneConsumptionComponent } from './zone-consumption';

describe('ZoneConsumptionComponent', () => {
  let component: ZoneConsumptionComponent;
  let fixture: ComponentFixture<ZoneConsumptionComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoneConsumptionComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ZoneConsumptionComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    // La carga inicial dispara peticiones de catálogos + consulta; se responden
    // con formas vacías coherentes con cada servicio en esta prueba de humo.
    for (const req of httpMock.match(() => true)) {
      const url = req.request.url;
      if (url.includes('/routes/periods')) {
        req.flush([]);
      } else if (url.includes('/zone-consumption')) {
        req.flush({ data: [], meta: {}, kpis: {} });
      } else {
        // comunidades y sectores (respuestas paginadas)
        req.flush({ data: [], total: 0, page: 1, limit: 100 });
      }
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('zoneConsumptionScreenCoversLoadingEmptyErrorAndResults', () => {
    // Estado inicial: cargando mientras la consulta está en vuelo.
    expect(component.workspaceStatus()).toBe('loading');

    // Sin datos tras responder vacío → estado vacío.
    component.reportData.set(null);
    component.isLoadingData.set(false);
    expect(component.workspaceStatus()).toBe('empty');

    // Error de consulta → estado error.
    component.workspaceError.set('fallo');
    expect(component.workspaceStatus()).toBe('error');
    component.workspaceError.set('');

    // Con zonas → estado idle (resultados).
    component.reportData.set({
      data: [
        {
          sectorId: '1',
          sectorNombre: 'Sector Norte',
          comunidadNombre: 'Olón Centro',
          consumoTotal: '320.00',
          consumoTotalNum: 320,
          medidoresConLectura: 3,
          consumoPromedio: '106.67',
          estimadasCount: 0,
          estimadasVolumen: '0.00',
          medidoresSinLectura: 0,
          porcentajeSistema: '100.0',
        },
      ],
      meta: { total: 1, periodoNombre: 'ENERO 2024' },
      kpis: {
        consumoTotalSistema: '320.00',
        totalZonas: 1,
        zonaMayorConsumo: 'Sector Norte',
        medidoresSinLectura: 0,
      },
    });
    expect(component.workspaceStatus()).toBe('idle');
    expect(component.filteredZonas().length).toBe(1);
  });
});
