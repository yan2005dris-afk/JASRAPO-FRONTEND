import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';

import { Sidebar } from './sidebar.component';
import { MenuItem } from '../../core/models/menu.model';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let routerEvents$: Subject<NavigationEnd>;
  let mockRouter: { events: Subject<NavigationEnd>; url: string };

  beforeEach(async () => {
    routerEvents$ = new Subject<NavigationEnd>();
    mockRouter = { events: routerEvents$, url: '/' };

    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [{ provide: Router, useValue: mockRouter }],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isParentActive', () => {
    function navigateTo(url: string): void {
      routerEvents$.next(new NavigationEnd(1, url, url));
    }

    it('matches an exact route', () => {
      navigateTo('/app/reports');
      expect(component.isParentActive(item({ route: '/app/reports' }))).toBe(true);
    });

    it('matches a parent route when on a child route', () => {
      navigateTo('/app/reports/monthly');
      expect(component.isParentActive(item({ route: '/app/reports' }))).toBe(true);
    });

    it('does NOT falsely match a route that is only a prefix of the current URL', () => {
      // Regression test: with startsWith('/app/reports'), navigating to
      // /app/reports-archive would have falsely highlighted the parent.
      navigateTo('/app/reports-archive');
      expect(component.isParentActive(item({ route: '/app/reports' }))).toBe(false);
    });

    it('matches via a child route', () => {
      navigateTo('/app/admin/users');
      expect(
        component.isParentActive(
          item({
            route: undefined,
            children: [item({ id: 2, route: '/app/admin/users', name: 'Users' })],
          }),
        ),
      ).toBe(true);
    });

    it('returns false when neither the item route nor any child matches', () => {
      navigateTo('/app/dashboard');
      expect(component.isParentActive(item({ route: '/app/settings' }))).toBe(false);
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
