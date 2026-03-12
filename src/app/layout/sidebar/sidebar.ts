import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { MenuItem } from '../../core/models/menu.model';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  readonly menuService = inject(MenuService);
  expandedItems = signal<Record<number, boolean>>({});

  toggleItem(itemId: number): void {
    console.log('>>> [Sidebar] Clic en el menú padre con ID:', itemId);

    this.expandedItems.update(state => {
      const newState = { ...state, [itemId]: !state[itemId] };
      console.log('    - Nuevo estado de abiertos:', newState);
      return newState;
    });
  }

  isExpanded(itemId: number): boolean {
    return !!this.expandedItems()[itemId];
  }
}
