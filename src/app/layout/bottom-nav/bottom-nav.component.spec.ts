import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { BottomNavComponent } from './bottom-nav.component';
import { MenuService } from '../../core/services/menu.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { MenuItem } from '../../core/models/menu.model';

describe('BottomNavComponent', () => {
  let component: BottomNavComponent;
  let fixture: ComponentFixture<BottomNavComponent>;
  let menuItemsSignal: ReturnType<typeof signal<MenuItem[]>>;
  let totalQueuedSignal: ReturnType<typeof signal<number>>;

  beforeEach(async () => {
    menuItemsSignal = signal<MenuItem[]>([]);
    totalQueuedSignal = signal<number>(0);

    const mockMenuService = {
      menuItems: menuItemsSignal,
    };

    const mockSyncService = {
      totalQueued: totalQueuedSignal,
    };

    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [
        provideRouter([]),
        { provide: MenuService, useValue: mockMenuService },
        { provide: OperatorSyncService, useValue: mockSyncService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter, sort by bottomNavOrder and limit to 5 items strictly from MenuService', () => {
    const mockMenu: MenuItem[] = [
      {
        id: 1,
        name: 'Dashboard',
        route: '/app/dashboard',
        showInBottomNav: true,
        bottomNavOrder: 5,
        menu_order: 1,
        is_active: true,
      },
      {
        id: 2,
        name: 'No Bottom',
        route: '/app/admin',
        showInBottomNav: false,
        menu_order: 2,
        is_active: true,
      },
      {
        id: 3,
        name: 'Operaciones',
        menu_order: 3,
        is_active: true,
        children: [
          {
            id: 31,
            name: 'Rutas',
            route: '/app/operador/rutas',
            showInBottomNav: true,
            bottomNavOrder: 1,
            menu_order: 1,
            is_active: true,
          },
          {
            id: 32,
            name: 'Lecturas',
            route: '/app/operador/lecturas',
            showInBottomNav: true,
            bottomNavOrder: 2,
            menu_order: 2,
            is_active: true,
          },
        ],
      },
    ];

    menuItemsSignal.set(mockMenu);

    const items = component.bottomNavItems();
    expect(items.length).toBe(3);
    // Ordered by bottomNavOrder: Rutas (1), Lecturas (2), Dashboard (5)
    expect(items[0].name).toBe('Rutas');
    expect(items[1].name).toBe('Lecturas');
    expect(items[2].name).toBe('Dashboard');
  });

  it('should return empty list when menu has no items flagged for bottom nav without hardcoded fallbacks', () => {
    menuItemsSignal.set([
      { id: 10, name: 'Admin Only', route: '/app/admin/roles', is_active: true, menu_order: 1 },
    ]);

    const items = component.bottomNavItems();
    expect(items.length).toBe(0);
  });
});
