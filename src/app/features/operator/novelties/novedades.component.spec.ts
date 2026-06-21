import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NovedadesComponent } from './novedades.component';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorService } from '../service/operator.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { MetersService } from '../../contracts/meters/services/meters.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { HttpClient } from '@angular/common/http';
import type { ReadingWithAnomaly } from '../models/operator.models';

const mockAnomaly: ReadingWithAnomaly = {
  lecturaId: 'l-001',
  medidorSerie: 'SER-001',
  fecha: '2026-06-15T10:00:00Z',
  estado: 'PROCESADA',
  anomalias: [{ tipo: 'FUGA', observacion: 'Fuga detectada', estado: 'PENDIENTE' }],
};

function makeNetworkMock(isOnline: boolean) {
  return { isOnline: vi.fn().mockReturnValue(isOnline) };
}

describe('NovedadesComponent', () => {
  let component: NovedadesComponent;
  let fixture: ComponentFixture<NovedadesComponent>;
  let operatorServiceMock: { getReadingsWithAnomalies: ReturnType<typeof vi.fn> };
  let networkMock: { isOnline: ReturnType<typeof vi.fn> };

  const operatorSyncMock = {
    totalPending: vi.fn().mockReturnValue(0),
    totalRejected: vi.fn().mockReturnValue(0),
    totalQueued: vi.fn().mockReturnValue(0),
    isSyncing: vi.fn().mockReturnValue(false),
    submitAnomaly: vi.fn().mockResolvedValue(undefined),
    syncPendingData: vi.fn().mockResolvedValue(undefined),
    refreshPendingCounts: vi.fn(),
    needsInitialSync: vi.fn().mockReturnValue(false),
    syncCatalogAndReadings: vi.fn(),
  };

  const dbServiceMock = {
    getMetersCache: vi.fn().mockResolvedValue([]),
  };

  const httpMock = { get: vi.fn(), post: vi.fn() };
  const metersServiceMock = { getMeters: vi.fn().mockReturnValue(of([])) };
  const toastServiceMock = { error: vi.fn(), success: vi.fn() };

  beforeEach(async () => {
    operatorServiceMock = {
      getReadingsWithAnomalies: vi.fn().mockReturnValue(of([])),
    };
    networkMock = makeNetworkMock(true);

    await TestBed.configureTestingModule({
      imports: [NovedadesComponent],
      providers: [
        provideRouter([]),
        { provide: NetworkService, useValue: networkMock },
        { provide: OperatorService, useValue: operatorServiceMock },
        { provide: OperatorSyncService, useValue: operatorSyncMock },
        { provide: IndexedDbService, useValue: dbServiceMock },
        { provide: MetersService, useValue: metersServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: HttpClient, useValue: httpMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NovedadesComponent);
    component = fixture.componentInstance;
  });

  describe('pending anomalies loading (online)', () => {
    it('calls getReadingsWithAnomalies on init when online', async () => {
      networkMock.isOnline.mockReturnValue(true);
      operatorServiceMock.getReadingsWithAnomalies.mockReturnValue(of([mockAnomaly]));

      await fixture.whenStable();
      fixture.detectChanges();

      expect(operatorServiceMock.getReadingsWithAnomalies).toHaveBeenCalled();
      expect(component.pendingAnomalies().length).toBe(1);
      expect(component.pendingAnomalies()[0].medidorSerie).toBe('SER-001');
    });

    it('populates pendingAnomalies with results from backend', async () => {
      const anomalies = [
        mockAnomaly,
        { ...mockAnomaly, lecturaId: 'l-002', medidorSerie: 'SER-002' },
      ];
      operatorServiceMock.getReadingsWithAnomalies.mockReturnValue(of(anomalies));
      networkMock.isOnline.mockReturnValue(true);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.pendingAnomalies().length).toBe(2);
    });
  });

  describe('pending anomalies loading (offline)', () => {
    it('does NOT call getReadingsWithAnomalies when offline', async () => {
      networkMock.isOnline.mockReturnValue(false);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(operatorServiceMock.getReadingsWithAnomalies).not.toHaveBeenCalled();
    });

    it('sets offlineMode signal to true when offline', async () => {
      networkMock.isOnline.mockReturnValue(false);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.offlineMode()).toBe(true);
    });
  });

  describe('report form section visibility', () => {
    it('reportSectionExpanded starts as false', () => {
      expect(component.reportSectionExpanded()).toBe(false);
    });

    it('toggleReportSection flips expanded state to true', () => {
      component.reportSectionExpanded.set(false);
      component.toggleReportSection();
      expect(component.reportSectionExpanded()).toBe(true);
    });

    it('toggleReportSection flips expanded state back to false', () => {
      component.reportSectionExpanded.set(true);
      component.toggleReportSection();
      expect(component.reportSectionExpanded()).toBe(false);
    });
  });
});
