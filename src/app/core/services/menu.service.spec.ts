import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { MenuService } from './menu.service';
import { MenuItem } from '../models/menu.model';
import { environment } from '../../../environments/environment';

describe('MenuService', () => {
  let service: MenuService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MenuService],
    });

    service = TestBed.inject(MenuService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.menuItems()).toEqual([]);
  });

  it('should fetch menu from backend and format routes with /app prefix', () => {
    const rawMenu: MenuItem[] = [
      {
        id: 1,
        name: 'Dashboard',
        route: 'dashboard',
        menu_order: 1,
        is_active: true,
      },
      {
        id: 2,
        name: 'Operaciones',
        menu_order: 2,
        is_active: true,
        children: [
          {
            id: 21,
            name: 'Rutas',
            route: 'operador/rutas',
            menu_order: 1,
            is_active: true,
          },
          {
            id: 22,
            name: 'Lecturas',
            route: '/app/operador/lecturas',
            menu_order: 2,
            is_active: true,
          },
        ],
      },
    ];

    service.getMenuFromBackend().subscribe((items) => {
      expect(items.length).toBe(2);

      // Route format prefix
      expect(items[0].route).toBe('/app/dashboard');

      // Nested child route format prefix
      const child1 = items[1].children![0];
      expect(child1.route).toBe('/app/operador/rutas');

      const child2 = items[1].children![1];
      expect(child2.route).toBe('/app/operador/lecturas');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/menus/my`);
    expect(req.request.method).toBe('GET');
    req.flush(rawMenu);

    // Verify signal state update
    expect(service.menuItems().length).toBe(2);
  });

  it('should clear stored menu on clearMenu()', () => {
    // Manually trigger getMenuFromBackend
    service.getMenuFromBackend().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/menus/my`);
    req.flush([{ id: 1, name: 'Home', route: '/app/home', menu_order: 1, is_active: true }]);

    expect(service.menuItems().length).toBe(1);

    service.clearMenu();
    expect(service.menuItems()).toEqual([]);
  });
});
