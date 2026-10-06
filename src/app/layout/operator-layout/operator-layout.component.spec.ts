import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { OperatorLayoutComponent } from './operator-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { NetworkService } from '../../core/services/network.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';
import { signal } from '@angular/core';
import { vi } from 'vitest';

interface AuthServiceMock {
  currentUser: ReturnType<typeof signal<{ name: string; roleName: string }>>;
  logout: ReturnType<typeof vi.fn>;
}

interface NetworkServiceMock {
  isOnline: ReturnType<typeof signal<boolean>>;
}

interface SyncServiceMock {
  totalPending: ReturnType<typeof signal<number>>;
  totalQueued: ReturnType<typeof signal<number>>;
  isSyncing: ReturnType<typeof signal<boolean>>;
  syncPendingData: ReturnType<typeof vi.fn>;
}

describe('OperatorLayoutComponent', () => {
  let authServiceMock: AuthServiceMock;
  let networkServiceMock: NetworkServiceMock;
  let syncServiceMock: SyncServiceMock;

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
      totalQueued: signal(0),
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

  it('renders the brand text in light mode for the corporate topbar', () => {
    const fixture = TestBed.createComponent(OperatorLayoutComponent);
    fixture.detectChanges();

    const logo = fixture.debugElement.query(By.directive(BrandLogoComponent))
      .componentInstance as BrandLogoComponent;
    expect(logo.textColor()).toBe('light');
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
