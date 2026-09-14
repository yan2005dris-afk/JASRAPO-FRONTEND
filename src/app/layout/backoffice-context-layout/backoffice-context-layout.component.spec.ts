import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { BackofficeContextLayoutComponent } from './backoffice-context-layout.component';
import { LayoutService } from '../../core/services/layout.service';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';
import { NetworkService } from '../../core/services/network.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { AppContextService } from '../../core/navigation/app-context.service';

describe('BackofficeContextLayoutComponent', () => {
  let component: BackofficeContextLayoutComponent;
  let fixture: ComponentFixture<BackofficeContextLayoutComponent>;
  let sidebarOpenSignal = signal(true);

  beforeEach(async () => {
    sidebarOpenSignal = signal(true);
    await TestBed.configureTestingModule({
      imports: [BackofficeContextLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: LayoutService,
          useValue: {
            sidebarOpen: sidebarOpenSignal,
            openSidebar: vi.fn(),
            closeSidebar: vi.fn(),
            toggleSidebar: vi.fn(),
            closeSidebarOnMobileNavigation: vi.fn(),
          },
        },
        {
          provide: MenuService,
          useValue: {
            menuItems: signal([]),
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ name: 'Admin User', roleName: 'Admin' }),
            capabilities: signal([{ resource: 'dashboard', action: 'read' }]),
            isAdminOrSupervisor: vi.fn(() => true),
            logout: vi.fn(),
          },
        },
        {
          provide: NetworkService,
          useValue: {
            isOnline: signal(true),
          },
        },
        {
          provide: OperatorSyncService,
          useValue: {
            totalPending: signal(0),
            totalQueued: signal(0),
            isSyncing: signal(false),
            syncPendingData: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AppContextService,
          useValue: {
            isOperator: signal(false),
            isBackoffice: signal(true),
            currentContext: signal('backoffice'),
            hasDualContext: signal(false),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BackofficeContextLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create backoffice context layout', () => {
    expect(component).toBeTruthy();
  });

  it('renders sidebar, header and breadcrumb components', () => {
    const sidebar = fixture.nativeElement.querySelector('app-sidebar');
    const header = fixture.nativeElement.querySelector('app-header');
    const breadcrumb = fixture.nativeElement.querySelector('app-breadcrumb');
    expect(sidebar).toBeTruthy();
    expect(header).toBeTruthy();
    expect(breadcrumb).toBeTruthy();
  });

  it('renders overlay when sidebar is open and handles click', () => {
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('.sidebar-overlay');
    expect(overlay).toBeTruthy();

    overlay.click();
    expect(component.layoutService.closeSidebar).toHaveBeenCalled();
  });
});
