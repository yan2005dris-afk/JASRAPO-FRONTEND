import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OperatorLayoutComponent } from './operator-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { NetworkService } from '../../core/services/network.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { signal, computed } from '@angular/core';
import { vi } from 'vitest';

describe('OperatorLayoutComponent', () => {
  let authServiceMock: any;
  let networkServiceMock: any;
  let syncServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      currentUser: signal({ name: 'Operador Test', roleName: 'Operador' }),
      logout: vi.fn(),
    };

    networkServiceMock = {
      isOnline: signal(true),
    };

    syncServiceMock = {
      totalPending: signal(0),
      isSyncing: signal(false),
      syncPendingData: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [OperatorLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: NetworkService, useValue: networkServiceMock },
        { provide: OperatorSyncService, useValue: syncServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(OperatorLayoutComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should call authService.logout on onLogout', () => {
    const fixture = TestBed.createComponent(OperatorLayoutComponent);
    const component = fixture.componentInstance;
    component.onLogout();
    expect(authServiceMock.logout).toHaveBeenCalled();
  });

  it('should call syncService.syncPendingData on forceSync when online and having pending items', async () => {
    const fixture = TestBed.createComponent(OperatorLayoutComponent);
    const component = fixture.componentInstance;

    // Simular que estamos online y tenemos 3 pendientes
    networkServiceMock.isOnline.set(true);
    syncServiceMock.totalPending.set(3);

    await component.forceSync();
    expect(syncServiceMock.syncPendingData).toHaveBeenCalled();
  });
});
