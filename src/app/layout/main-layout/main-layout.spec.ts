import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';

import { MainLayout } from './main-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { NetworkService } from '../../core/services/network.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { LayoutService } from '../../core/services/layout.service';

describe('MainLayout Component & Mobile Behavior', () => {
  let component: MainLayout;
  let fixture: ComponentFixture<MainLayout>;
  let layoutService: LayoutService;

  beforeEach(async () => {
    const mockAuthService = {
      logout: vi.fn(),
      isAuthenticated: signal(true),
      currentUser: signal({ name: 'Test User', roleName: 'Admin' }),
      token: signal('mock-token'),
      sid: signal('mock-sid'),
      tokenCreatedAt: signal(new Date().toISOString()),
      tokenExpiresAt: signal(new Date().toISOString()),
      isOperator: vi.fn(() => false),
      isAdminOrSupervisor: vi.fn(() => true),
      canAccessOperatorRoutes: vi.fn(() => true),
      getDefaultRoute: vi.fn(() => '/app/dashboard'),
    };

    const mockMenuService = {
      getMenuFromBackend: vi.fn(() => of([])),
      clearMenu: vi.fn(),
      menuItems: signal([]),
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

    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: MenuService, useValue: mockMenuService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: OperatorSyncService, useValue: mockSyncService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    layoutService = TestBed.inject(LayoutService);
    fixture = TestBed.createComponent(MainLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create layout component', () => {
    expect(component).toBeTruthy();
  });

  it('should render overlay when sidebar is open and close sidebar on overlay click', () => {
    layoutService.openSidebar();
    fixture.detectChanges();

    const overlay = fixture.debugElement.query(By.css('.sidebar-overlay'));
    expect(overlay).toBeTruthy();

    overlay.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(layoutService.sidebarOpen()).toBe(false);
  });

  it('should not render overlay when sidebar is closed', () => {
    layoutService.closeSidebar();
    fixture.detectChanges();

    const overlay = fixture.debugElement.query(By.css('.sidebar-overlay'));
    expect(overlay).toBeFalsy();
  });
});
