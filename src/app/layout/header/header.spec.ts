import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { NetworkService } from '../../core/services/network.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';

import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    const isAdminSignal = signal(true);
    const mockAuthService = {
      logout: vi.fn(),
      isAuthenticated: signal(true),
      currentUser: signal({ name: 'Test User', roleName: 'Admin' }),
      token: signal('mock-token'),
      sid: signal('mock-sid'),
      tokenCreatedAt: signal(new Date().toISOString()),
      tokenExpiresAt: signal(new Date().toISOString()),
      isAdminOrSupervisor: vi.fn(() => isAdminSignal()),
      _setIsAdmin: (val: boolean) => isAdminSignal.set(val),
    };

    const mockNetworkService = {
      isOnline: signal(true),
    };

    const mockSyncService = {
      totalPending: signal(0),
      isSyncing: signal(false),
      syncPendingData: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: OperatorSyncService, useValue: mockSyncService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show Configuración dropdown item only when user is admin or supervisor', () => {
    component.userDropdownOpen.set(true);
    fixture.detectChanges();

    let text = fixture.nativeElement.textContent;
    expect(text).toContain('Configuración');

    // Cambiar a operador (no admin)
    (component.authService as unknown as { _setIsAdmin: (v: boolean) => void })._setIsAdmin(false);
    fixture.detectChanges();

    text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Configuración');
  });
});
