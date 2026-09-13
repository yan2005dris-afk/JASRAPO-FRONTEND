import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private readonly platformId = inject(PLATFORM_ID);

  // Determinar estado inicial: cerrado en dispositivos móviles (<992px)
  readonly sidebarOpen = signal<boolean>(this.getInitialSidebarState());

  private getInitialSidebarState(): boolean {
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      return window.innerWidth >= 992;
    }
    return true;
  }

  /**
   * Indica si la pantalla actual corresponde al breakpoint móvil (<992px)
   */
  isMobile(): boolean {
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      return window.innerWidth < 992;
    }
    return false;
  }

  /**
   * Cambia el estado del sidebar
   */
  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  /**
   * Abre el sidebar
   */
  openSidebar(): void {
    this.sidebarOpen.set(true);
  }

  /**
   * Cierra el sidebar
   */
  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  /**
   * Cierra el sidebar si estamos en un dispositivo móvil (<992px)
   */
  closeSidebarOnMobileNavigation(): void {
    if (this.isMobile() && this.sidebarOpen()) {
      this.closeSidebar();
    }
  }
}
