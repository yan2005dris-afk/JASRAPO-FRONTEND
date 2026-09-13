import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  it('should initialize sidebar as closed on mobile screens (<992px)', () => {
    // Simular viewport móvil
    vi.stubGlobal('innerWidth', 500);

    TestBed.configureTestingModule({
      providers: [LayoutService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    const service = TestBed.inject(LayoutService);
    expect(service.isMobile()).toBe(true);
    expect(service.sidebarOpen()).toBe(false);

    vi.unstubAllGlobals();
  });

  it('should initialize sidebar as open on desktop screens (>=992px)', () => {
    // Simular viewport escritorio
    vi.stubGlobal('innerWidth', 1200);

    TestBed.configureTestingModule({
      providers: [LayoutService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    const service = TestBed.inject(LayoutService);
    expect(service.isMobile()).toBe(false);
    expect(service.sidebarOpen()).toBe(true);

    vi.unstubAllGlobals();
  });

  it('should toggle, open and close sidebar', () => {
    vi.stubGlobal('innerWidth', 1200);

    TestBed.configureTestingModule({
      providers: [LayoutService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    const service = TestBed.inject(LayoutService);
    expect(service.sidebarOpen()).toBe(true);

    service.toggleSidebar();
    expect(service.sidebarOpen()).toBe(false);

    service.openSidebar();
    expect(service.sidebarOpen()).toBe(true);

    service.closeSidebar();
    expect(service.sidebarOpen()).toBe(false);

    vi.unstubAllGlobals();
  });

  it('should close sidebar on mobile navigation only when on mobile viewport', () => {
    vi.stubGlobal('innerWidth', 500);

    TestBed.configureTestingModule({
      providers: [LayoutService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    const service = TestBed.inject(LayoutService);
    service.openSidebar();
    expect(service.sidebarOpen()).toBe(true);

    service.closeSidebarOnMobileNavigation();
    expect(service.sidebarOpen()).toBe(false);

    vi.unstubAllGlobals();
  });
});
