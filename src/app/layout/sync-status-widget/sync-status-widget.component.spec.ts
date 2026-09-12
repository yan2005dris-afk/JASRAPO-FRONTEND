import { TestBed } from '@angular/core/testing';
import { SyncStatusWidgetComponent } from './sync-status-widget.component';
import { NetworkService } from '../../core/services/network.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { signal } from '@angular/core';
import { vi } from 'vitest';

describe('SyncStatusWidgetComponent', () => {
  let networkServiceMock: { isOnline: ReturnType<typeof signal<boolean>> };
  let syncServiceMock: {
    totalPending: ReturnType<typeof signal<number>>;
    isSyncing: ReturnType<typeof signal<boolean>>;
    syncPendingData: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    networkServiceMock = {
      isOnline: signal(true),
    };

    syncServiceMock = {
      totalPending: signal(0),
      isSyncing: signal(false),
      syncPendingData: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [SyncStatusWidgetComponent],
      providers: [
        { provide: NetworkService, useValue: networkServiceMock },
        { provide: OperatorSyncService, useValue: syncServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(SyncStatusWidgetComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should call syncService.syncPendingData on forceSync when online and having pending items', async () => {
    const fixture = TestBed.createComponent(SyncStatusWidgetComponent);
    const component = fixture.componentInstance;

    networkServiceMock.isOnline.set(true);
    syncServiceMock.totalPending.set(2);

    await component.forceSync();
    expect(syncServiceMock.syncPendingData).toHaveBeenCalled();
  });
});
