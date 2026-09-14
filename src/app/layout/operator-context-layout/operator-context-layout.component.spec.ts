import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { OperatorContextLayoutComponent } from './operator-context-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { NetworkService } from '../../core/services/network.service';
import { LayoutService } from '../../core/services/layout.service';
import { AppContextService } from '../../core/navigation/app-context.service';

describe('OperatorContextLayoutComponent', () => {
  let component: OperatorContextLayoutComponent;
  let fixture: ComponentFixture<OperatorContextLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatorContextLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ name: 'Operator User', roleName: 'Operador' }),
            capabilities: signal([{ resource: 'routes', action: 'read' }]),
            isAdminOrSupervisor: vi.fn(() => false),
            logout: vi.fn(),
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
          provide: NetworkService,
          useValue: {
            isOnline: signal(true),
          },
        },
        {
          provide: LayoutService,
          useValue: {
            sidebarOpen: signal(false),
            toggleSidebar: vi.fn(),
          },
        },
        {
          provide: AppContextService,
          useValue: {
            isOperator: signal(true),
            isBackoffice: signal(false),
            currentContext: signal('operator'),
            hasDualContext: signal(false),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OperatorContextLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create operator context layout', () => {
    expect(component).toBeTruthy();
  });

  it('renders header and bottom nav components', () => {
    const header = fixture.nativeElement.querySelector('app-header');
    const bottomNav = fixture.nativeElement.querySelector('app-bottom-nav');
    expect(header).toBeTruthy();
    expect(bottomNav).toBeTruthy();
  });
});
