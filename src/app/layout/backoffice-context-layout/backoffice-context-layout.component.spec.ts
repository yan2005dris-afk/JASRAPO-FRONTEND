import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { BackofficeContextLayoutComponent } from './backoffice-context-layout.component';
import { LayoutService } from '../../core/services/layout.service';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';

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
            closeSidebar: vi.fn(),
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
            capabilities: signal([{ resource: 'dashboard', action: 'read' }]),
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

  it('renders sidebar and breadcrumb components', () => {
    const sidebar = fixture.nativeElement.querySelector('app-sidebar');
    const breadcrumb = fixture.nativeElement.querySelector('app-breadcrumb');
    expect(sidebar).toBeTruthy();
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
