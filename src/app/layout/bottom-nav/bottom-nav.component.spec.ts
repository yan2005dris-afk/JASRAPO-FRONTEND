import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { BottomNavComponent } from './bottom-nav.component';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';

describe('BottomNavComponent', () => {
  let component: BottomNavComponent;
  let fixture: ComponentFixture<BottomNavComponent>;

  beforeEach(async () => {
    const mockAuthService = {
      isOperator: vi.fn(() => true),
    };

    const mockMenuService = {
      menuItems: signal([]),
    };

    const mockSyncService = {
      totalQueued: signal(0),
    };

    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
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

  it('should return fallback operator tabs when menu is empty and user is operator', () => {
    const items = component.bottomNavItems();
    expect(items.length).toBe(4);
    expect(items[0].route).toBe('/app/operador/rutas');
  });
});
