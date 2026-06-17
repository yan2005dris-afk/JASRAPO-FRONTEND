import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { LayoutService } from '../../core/services/layout.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, MatTooltipModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly menuService = inject(MenuService);
  readonly layoutService = inject(LayoutService);

  /**
   * Estado reactivo para controlar qué elementos del menú están expandidos.
   * Usamos Record<number, boolean> para manejar múltiples submenús abiertos.
   */
  readonly expandedItems = signal<Record<number, boolean>>({});

  /**
   * Alterna la visibilidad de un submenú.
   * @param itemId ID único del elemento del menú.
   */
  toggleItem(itemId: number): void {
    if (!this.layoutService.sidebarOpen()) {
      this.layoutService.openSidebar();
      this.expandedItems.update((state) => ({
        ...state,
        [itemId]: true,
      }));
    } else {
      this.expandedItems.update((state) => ({
        ...state,
        [itemId]: !state[itemId],
      }));
    }
  }

  /**
   * Verifica si un ítem específico está expandido.
   * @param itemId ID único del elemento del menú.
   */
  isExpanded(itemId: number): boolean {
    return !!this.expandedItems()[itemId];
  }
}
