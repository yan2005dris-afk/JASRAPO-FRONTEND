import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { By } from '@angular/platform-browser';

import { MainLayout } from './main-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { NetworkService } from '../../core/services/network.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { AppContextService } from '../../core/navigation/app-context.service';

describe('MainLayout Component (AuthenticatedAppShell)', () => {
  let component: MainLayout;
  let fixture: ComponentFixture<MainLayout>;

  beforeEach(async () => {
    const mockAuthService = {
      logout: vi.fn(),
      isAuthenticated: signal(true),
      currentUser: signal({ name: 'Test User', roleName: 'Admin' }),
      token: signal('mock-token'),
      sid: signal('mock-sid'),
      tokenCreatedAt: signal(new Date().toISOString()),
      tokenExpiresAt: signal(new Date().toISOString()),
      capabilities: signal([]),
      isAdminOrSupervisor: vi.fn(() => true),
      getDefaultRoute: vi.fn(() => '/app/backoffice/dashboard'),
    };

    const mockNetworkService = {
      isOnline: signal(true),
    };

    const mockSyncService = {
      totalPending: signal(0),
      totalQueued: signal(0),
      isSyncing: signal(false),
      syncPendingData: vi.fn().mockResolvedValue(undefined),
    };

    const mockAppContextService = {
      isOperator: signal(false),
      isBackoffice: signal(true),
      currentContext: signal('backoffice'),
      hasDualContext: signal(false),
      switchToContext: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: OperatorSyncService, useValue: mockSyncService },
        { provide: AppContextService, useValue: mockAppContextService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create layout component', () => {
    expect(component).toBeTruthy();
  });

  it('renders shared header and router outlet', () => {
    expect(fixture.debugElement.query(By.css('app-header'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('router-outlet'))).toBeTruthy();
  });
});
