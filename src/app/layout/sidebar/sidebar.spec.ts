import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';

import { Sidebar } from './sidebar.component';
import { MenuService } from '../../core/services/menu.service';
import { LayoutService } from '../../core/services/layout.service';
import { AuthService } from '../../core/services/auth.service';
import { AppContextService } from '../../core/navigation/app-context.service';
import { MenuItem } from '../../core/models/menu.model';
import { SessionCapabilityGrant } from '../../core/models/auth.model';
import { AppContext } from '../../core/navigation/app-route.registry';

@Component({ template: '' })
class DummyComponent {}

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let router: Router;
  let currentContextSignal = signal<AppContext>('operator');
  let capabilitiesSignal = signal<SessionCapabilityGrant[]>([]);
  let menuItemsSignal = signal<MenuItem[]>([]);

  beforeEach(async () => {
    currentContextSignal = signal<AppContext>('operator');
    capabilitiesSignal = signal<SessionCapabilityGrant[]>([
      { resource: 'routes', action: 'read' },
      { resource: 'dashboard', action: 'read' },
    ]);
    menuItemsSignal = signal<MenuItem[]>([
      {
        id: 10,
        name: 'Legacy Operator',
        route: '/app/operador/rutas',
        is_active: true,
        menu_order: 1,
      },
      {
        id: 20,
        name: 'Administrative',
        route: '/app/admin/users',
        is_active: true,
        menu_order: 2,
      },
      {
        id: 30,
        name: 'Lectura de Consumo',
        route: '/app/Contratos/LecturaDeConsumo',
        is_active: true,
        menu_order: 3,
      },
    ]);

    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([{ path: '**', component: DummyComponent }]),
        { provide: MenuService, useValue: { menuItems: menuItemsSignal } },
        {
          provide: LayoutService,
          useValue: {
            sidebarOpen: signal(false),
            openSidebar: vi.fn(),
            closeSidebarOnMobileNavigation: vi.fn(),
          },
        },
        { provide: AuthService, useValue: { capabilities: capabilitiesSignal } },
        {
          provide: AppContextService,
          useValue: {
            currentContext: currentContextSignal,
            isOperator: signal(false),
            isBackoffice: signal(true),
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders operator registry routes when in operator context', () => {
    currentContextSignal.set('operator');
    fixture.detectChanges();

    const items = component.visibleMenuItems();
    expect(items.some((i) => i.route === '/app/operator/routes')).toBe(true);
    expect(items.some((i) => i.route === '/app/backoffice/dashboard')).toBe(false);
  });

  it('renders backoffice routes and strips operator routes when in backoffice context', () => {
    currentContextSignal.set('backoffice');
    fixture.detectChanges();

    const items = component.visibleMenuItems();
    expect(items.some((i) => i.route === '/app/backoffice/dashboard')).toBe(true);
    expect(items.some((i) => i.route === '/app/admin/users')).toBe(true);
    expect(items.some((i) => i.route === '/app/Contratos/LecturaDeConsumo')).toBe(true);
    expect(
      items.some((i) => i.route?.includes('/operador') || i.route?.includes('/operator')),
    ).toBe(false);
  });

  describe('isParentActive', () => {
    async function navigateTo(url: string): Promise<void> {
      await router.navigateByUrl(url);
      fixture.detectChanges();
    }

    it('matches an exact route', async () => {
      await navigateTo('/app/reports');
      expect(component.isParentActive(item({ route: '/app/reports' }))).toBe(true);
    });

    it('matches a parent route when on a child route', async () => {
      await navigateTo('/app/reports/monthly');
      expect(component.isParentActive(item({ route: '/app/reports' }))).toBe(true);
    });

    it('does NOT falsely match a route that is only a prefix of the current URL', async () => {
      await navigateTo('/app/reports-archive');
      expect(component.isParentActive(item({ route: '/app/reports' }))).toBe(false);
    });
  });
});

function item(overrides: Partial<MenuItem>): MenuItem {
  return {
    id: 1,
    name: 'Test',
    menu_order: 1,
    is_active: true,
    ...overrides,
  };
}
