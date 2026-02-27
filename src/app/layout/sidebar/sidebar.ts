import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { MenuItem } from '../../core/models/menu.model';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Sidebar {
  readonly menuService = inject(MenuService);
  readonly expandedItems = signal<Set<string>>(new Set());

  toggleItem(itemId: string): void {
    const expanded = this.expandedItems();
    const newExpanded = new Set(expanded);

    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }

    this.expandedItems.set(newExpanded);
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItems().has(itemId);
  }
}
