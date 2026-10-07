import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SincronizarComponent } from './sincronizar.component';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { NetworkService } from '../../../core/services/network.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { provideRouter } from '@angular/router';

describe('SincronizarComponent', () => {
  let component: SincronizarComponent;
  let fixture: ComponentFixture<SincronizarComponent>;
  let mockDbService: Record<string, unknown>;
  let mockSyncService: Record<string, unknown>;
  let mockNetworkService: Record<string, unknown>;
  let mockToastService: Record<string, unknown>;
  let mockConfirmService: Record<string, unknown>;
  let mockAuthService: Record<string, unknown>;

  beforeEach(async () => {
    mockAuthService = {
      currentUser: signal({ id: '42', name: 'Operador Test' }),
    };

    mockDbService = {
      getPendingReadingsByState: vi.fn().mockResolvedValue([]),
      getPendingAnomaliesByState: vi.fn().mockResolvedValue([]),
      getSyncedReadings: vi.fn().mockResolvedValue([]),
      getMetersCache: vi.fn().mockResolvedValue([{ medidorId: 1, serie: 'M-001' }]),
      getRoutesCache: vi.fn().mockResolvedValue({ items: [{ rutaId: '1' }] }),
      getRegisteredReadingsCache: vi.fn().mockResolvedValue([{ lecturaId: '10' }]),
      clearSyncedReadings: vi.fn().mockResolvedValue(undefined),
      updatePendingReading: vi.fn().mockResolvedValue(undefined),
      deletePendingReading: vi.fn().mockResolvedValue(undefined),
      updatePendingAnomaly: vi.fn().mockResolvedValue(undefined),
      deletePendingAnomaly: vi.fn().mockResolvedValue(undefined),
    };

    mockSyncService = {
      autoSyncEnabled: signal(true),
      isSyncing: signal(false),
      isDownloading: signal(false),
      lastDownloadTimestamp: signal('2026-08-29T00:00:00.000Z'),
      totalPending: signal(0),
      totalRejected: signal(0),
      totalQueued: signal(0),
      toggleAutoSync: vi.fn(),
      syncPendingData: vi.fn().mockResolvedValue(undefined),
      downloadAssignedData: vi.fn().mockResolvedValue({
        routesCount: 1,
        metersCount: 1,
        readingsCount: 1,
      }),
      refreshPendingCounts: vi.fn().mockResolvedValue(undefined),
    };

    mockNetworkService = {
      isOnline: vi.fn().mockReturnValue(true),
      connected$: of(true),
    };

    mockToastService = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    };

    mockConfirmService = {
      confirm: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [SincronizarComponent],
      providers: [
        provideRouter([]),
        { provide: IndexedDbService, useValue: mockDbService },
        { provide: OperatorSyncService, useValue: mockSyncService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService },
        { provide: ConfirmDialogService, useValue: mockConfirmService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SincronizarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('no repite el estado de conexión del encabezado global', () => {
    expect(fixture.nativeElement.querySelector('.online-status-chip')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Datos asignados y cambios pendientes');
  });

  it('separa los datos asignados de los cambios locales por subir', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Datos asignados offline');
    expect(text).toContain('Cambios locales por subir');
    expect(text).toContain('Enviados');
    expect(text).not.toContain('Sincronizados');
  });

  it('debería cargar las métricas de offline en init', async () => {
    await component.loadQueue();
    expect(component.cachedMetersCount()).toBe(1);
    expect(component.cachedRoutesCount()).toBe(1);
    expect(component.cachedReadingsCount()).toBe(1);
  });

  it('debería ejecutar downloadData delegando en OperatorSyncService', async () => {
    await component.downloadData();
    expect(mockSyncService['downloadAssignedData']).toHaveBeenCalled();
  });

  it('debería cambiar de pestaña correctamente', () => {
    component.switchTab('rechazados');
    expect(component.activeTab()).toBe('rechazados');
    component.switchTab('sincronizados');
    expect(component.activeTab()).toBe('sincronizados');
  });
});
