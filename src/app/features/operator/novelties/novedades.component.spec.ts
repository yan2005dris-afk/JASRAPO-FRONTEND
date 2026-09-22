import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NovedadesComponent } from './novedades.component';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorService } from '../service/operator.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { AuthService } from '../../../core/services/auth.service';
import { MetersService } from '../../contracts/meters/services/meters.service';
import { MeterCacheService } from '../../../core/services/meter-cache.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { HttpClient } from '@angular/common/http';
import type { ReadingWithAnomaly } from '../models/operator.models';

const mockAnomaly: ReadingWithAnomaly = {
  lecturaId: 'l-001',
  medidorId: 'M-001',
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
  let dbServiceMock: {
    getMetersCache: ReturnType<typeof vi.fn>;
    getPendingAnomalies: ReturnType<typeof vi.fn>;
    getNovedadesCache: ReturnType<typeof vi.fn>;
    saveNovedadesCache: ReturnType<typeof vi.fn>;
  };
  let meterCacheMock: {
    load: ReturnType<typeof vi.fn>;
    metersList: ReturnType<typeof signal>;
  };

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

  const authServiceMock = {
    currentUser: () => ({ id: 42 }),
  };

  const httpMock = { get: vi.fn(), post: vi.fn() };
  const metersServiceMock = { getMeters: vi.fn().mockReturnValue(of([])) };
  const toastServiceMock = { error: vi.fn(), success: vi.fn() };

  beforeEach(async () => {
    operatorServiceMock = {
      getReadingsWithAnomalies: vi.fn().mockReturnValue(of([])),
    };
    networkMock = makeNetworkMock(true);
    dbServiceMock = {
      getMetersCache: vi.fn().mockResolvedValue([]),
      getPendingAnomalies: vi.fn().mockResolvedValue([]),
      getNovedadesCache: vi.fn().mockResolvedValue(null),
      saveNovedadesCache: vi.fn().mockResolvedValue(undefined),
    };
    meterCacheMock = {
      load: vi.fn().mockResolvedValue(undefined),
      metersList: signal([]),
    };

    await TestBed.configureTestingModule({
      imports: [NovedadesComponent],
      providers: [
        provideRouter([]),
        { provide: NetworkService, useValue: networkMock },
        { provide: OperatorService, useValue: operatorServiceMock },
        { provide: OperatorSyncService, useValue: operatorSyncMock },
        { provide: IndexedDbService, useValue: dbServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: MeterCacheService, useValue: meterCacheMock },
        { provide: MetersService, useValue: metersServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: HttpClient, useValue: httpMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NovedadesComponent);
    component = fixture.componentInstance;
  });

  describe('anomaly loading (online)', () => {
    it('calls getReadingsWithAnomalies on init when online', async () => {
      networkMock.isOnline.mockReturnValue(true);
      operatorServiceMock.getReadingsWithAnomalies.mockReturnValue(of([mockAnomaly]));

      await fixture.whenStable();
      fixture.detectChanges();

      expect(operatorServiceMock.getReadingsWithAnomalies).toHaveBeenCalled();
      expect(component.anomalies().length).toBe(1);
      expect(component.anomalies()[0].medidorSerie).toBe('SER-001');
      expect(component.isOffline()).toBe(false);
    });

    it('populates anomalies signal with results from backend', async () => {
      const anomalies: ReadingWithAnomaly[] = [
        mockAnomaly,
        { ...mockAnomaly, lecturaId: 'l-002', medidorId: 'M-002', medidorSerie: 'SER-002' },
      ];
      operatorServiceMock.getReadingsWithAnomalies.mockReturnValue(of(anomalies));
      networkMock.isOnline.mockReturnValue(true);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.anomalies().length).toBe(2);
    });

    it('persists the novedades cache scoped to the operator when online', async () => {
      networkMock.isOnline.mockReturnValue(true);
      operatorServiceMock.getReadingsWithAnomalies.mockReturnValue(of([mockAnomaly]));

      await fixture.whenStable();
      fixture.detectChanges();

      expect(dbServiceMock.saveNovedadesCache).toHaveBeenCalledWith(
        'operator:42',
        expect.arrayContaining([expect.objectContaining({ lecturaId: 'l-001' })]),
      );
    });

    it('falls back to the offline cache when the online fetch fails', async () => {
      networkMock.isOnline.mockReturnValue(true);
      operatorServiceMock.getReadingsWithAnomalies.mockReturnValue(
        throwError(() => new Error('network down')),
      );
      dbServiceMock.getNovedadesCache.mockResolvedValue({
        items: [mockAnomaly],
        savedAt: new Date().toISOString(),
      });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isOffline()).toBe(true);
      expect(component.anomalies()).toHaveLength(1);
      expect(component.anomalies()[0].medidorSerie).toBe('SER-001');
    });
  });

  describe('anomaly loading (offline)', () => {
    it('does NOT call getReadingsWithAnomalies when offline', async () => {
      networkMock.isOnline.mockReturnValue(false);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(operatorServiceMock.getReadingsWithAnomalies).not.toHaveBeenCalled();
    });

    it('sets isOffline signal to true when offline', async () => {
      networkMock.isOnline.mockReturnValue(false);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isOffline()).toBe(true);
    });

    it('isOffline is false by default when online', async () => {
      networkMock.isOnline.mockReturnValue(true);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isOffline()).toBe(false);
    });

    it('renders cached items and exposes the cached-at timestamp', async () => {
      networkMock.isOnline.mockReturnValue(false);
      const savedAt = new Date().toISOString();
      dbServiceMock.getNovedadesCache.mockResolvedValue({
        items: [mockAnomaly],
        savedAt,
      });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.anomalies()).toHaveLength(1);
      expect(component.cachedAt()).toBe(savedAt);
      expect(component.isStale()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('guardados localmente');
    });

    it('marks the cache as stale when cachedAt is older than 24h', async () => {
      networkMock.isOnline.mockReturnValue(false);
      dbServiceMock.getNovedadesCache.mockResolvedValue({
        items: [mockAnomaly],
        savedAt: '2026-06-01T10:00:00Z',
      });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isStale()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('desactualizados');
    });

    it('does not mark a recent cache as stale', async () => {
      networkMock.isOnline.mockReturnValue(false);
      dbServiceMock.getNovedadesCache.mockResolvedValue({
        items: [mockAnomaly],
        savedAt: new Date().toISOString(),
      });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isStale()).toBe(false);
    });

    it('merges locally queued pending anomalies and renders the "Pendiente de sync" chip', async () => {
      networkMock.isOnline.mockReturnValue(false);
      dbServiceMock.getNovedadesCache.mockResolvedValue(null);
      dbServiceMock.getPendingAnomalies.mockResolvedValue([
        {
          id: 1,
          syncState: 'PENDIENTE_SYNC',
          errorMessage: null,
          medidorId: 'M-999',
          tipo: 'FUGA',
          observacion: 'Fuga detectada en tubería',
          estado: 'PENDIENTE',
        },
      ]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.anomalies()).toHaveLength(1);
      expect(component.anomalies()[0].isPending).toBe(true);
      expect(component.anomalies()[0].lecturaId).toBeNull();
      expect(component.anomalies()[0].estado).toBe('PENDIENTE');
      expect(component.anomalies()[0].anomalias[0].tipo).toBe('FUGA');
      expect(component.isOffline()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Pendiente de sync');
    });

    it('prepends pending anomalies before the cached list', async () => {
      networkMock.isOnline.mockReturnValue(false);
      dbServiceMock.getNovedadesCache.mockResolvedValue({
        items: [mockAnomaly],
        savedAt: new Date().toISOString(),
      });
      dbServiceMock.getPendingAnomalies.mockResolvedValue([
        {
          id: 1,
          syncState: 'PENDIENTE_SYNC',
          errorMessage: null,
          medidorId: 'M-999',
          tipo: 'MEDIDOR_DANADO',
          observacion: 'Medidor roto',
          estado: 'PENDIENTE',
        },
      ]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.anomalies()).toHaveLength(2);
      expect(component.anomalies()[0].isPending).toBe(true);
      expect(component.anomalies()[0].medidorId).toBe('M-999');
      expect(component.anomalies()[1].isPending).toBe(false);
      expect(component.anomalies()[1].lecturaId).toBe('l-001');
    });

    it('does not duplicate a pending anomaly already represented in the cache (match by medidorId)', async () => {
      networkMock.isOnline.mockReturnValue(false);
      dbServiceMock.getNovedadesCache.mockResolvedValue({
        items: [mockAnomaly],
        savedAt: new Date().toISOString(),
      });
      dbServiceMock.getPendingAnomalies.mockResolvedValue([
        {
          id: 1,
          syncState: 'PENDIENTE_SYNC',
          errorMessage: null,
          medidorId: 'M-001',
          tipo: 'FUGA',
          observacion: 'duplicado',
          estado: 'PENDIENTE',
        },
      ]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.anomalies()).toHaveLength(1);
      expect(component.anomalies()[0].isPending).toBe(false);
    });

    it('does not render an Edit button for pending items without a server lecturaId', async () => {
      networkMock.isOnline.mockReturnValue(false);
      dbServiceMock.getNovedadesCache.mockResolvedValue(null);
      dbServiceMock.getPendingAnomalies.mockResolvedValue([
        {
          id: 1,
          syncState: 'PENDIENTE_SYNC',
          errorMessage: null,
          medidorId: 'M-999',
          tipo: 'FUGA',
          observacion: 'Fuga',
          estado: 'PENDIENTE',
        },
      ]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.btn-edit')).toBeNull();
    });
  });

  describe('initial state', () => {
    it('anomalies signal starts empty', () => {
      expect(component.anomalies()).toEqual([]);
    });

    it('isLoading starts false', () => {
      expect(component.isLoading()).toBe(false);
    });
  });
});