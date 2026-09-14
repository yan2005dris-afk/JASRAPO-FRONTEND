import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { Sidebar } from './sidebar.component';
import { MenuService } from '../../core/services/menu.service';
import { LayoutService } from '../../core/services/layout.service';
import { AuthService } from '../../core/services/auth.service';
import { MenuItem } from '../../core/models/menu.model';
import { SessionCapabilityGrant } from '../../core/models/auth.model';

@Component({ template: '' })
class DummyComponent {}

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let router: Router;
  let capabilitiesSignal = signal<SessionCapabilityGrant[]>([]);
  let menuItemsSignal = signal<MenuItem[]>([]);

  beforeEach(async () => {
    capabilitiesSignal = signal<SessionCapabilityGrant[]>([
      { resource: 'dashboard', action: 'read' },
    ]);
    menuItemsSignal = signal<MenuItem[]>([
      {
        id: 20,
        name: 'Administrative',
        route: '/app/admin/users',
        is_active: true,
        menu_order: 1,
      },
      {
        id: 30,
        name: 'Lectura de Consumo',
        route: '/app/Contratos/LecturaDeConsumo',
        is_active: true,
        menu_order: 2,
      },
      {
        id: 40,
        name: 'Dashboard Duplicate',
        route: '/app/dashboard',
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

  it('renders backoffice registry routes and unmigrated administrative items', () => {
    fixture.detectChanges();

    const items = component.visibleMenuItems();
    expect(items.some((i) => i.route === '/app/backoffice/dashboard')).toBe(true);
    expect(items.some((i) => i.route === '/app/admin/users')).toBe(true);
    expect(items.some((i) => i.route === '/app/Contratos/LecturaDeConsumo')).toBe(true);
    // Deduplicates legacy dashboard route
    expect(items.some((i) => i.route === '/app/dashboard')).toBe(false);
  });

  it('filters out operator routes and Operaciones from backoffice sidebar', () => {
    menuItemsSignal.set([
      {
        id: 50,
        name: 'Operaciones',
        route: '/app/operator',
        is_active: true,
        menu_order: 1,
        children: [
          {
            id: 51,
            name: 'Toma de Lecturas',
            route: '/app/operator/readings',
            is_active: true,
            menu_order: 1,
          },
        ],
      },
      {
        id: 60,
        name: 'Contratos',
        route: '/app/Contratos',
        is_active: true,
        menu_order: 2,
      },
    ]);
    fixture.detectChanges();

    const items = component.visibleMenuItems();
    expect(items.some((i) => i.name === 'Operaciones')).toBe(false);
    expect(items.some((i) => i.route?.includes('/operator'))).toBe(false);
    expect(items.some((i) => i.name === 'Contratos')).toBe(true);
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
