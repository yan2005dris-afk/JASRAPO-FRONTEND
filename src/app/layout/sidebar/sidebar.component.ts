import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../core/services/menu.service';
import { LayoutService } from '../../core/services/layout.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MenuItem } from '../../core/models/menu.model';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, MatTooltipModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly menuService = inject(MenuService);
  readonly layoutService = inject(LayoutService);
  readonly router = inject(Router);

  readonly expandedItems = signal<Record<number, boolean>>({});
  readonly searchQuery = signal('');
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  isParentActive(item: MenuItem): boolean {
    const url = this.currentUrl();
    const matches = (route: string) => url === route || url.startsWith(route + '/');
    if (item.route && matches(item.route)) return true;
    if (!item.children?.length) return false;
    return item.children.some((child) => !!child.route && matches(child.route));
  }

  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  readonly filteredMenuItems = computed(() => {
    const query = this.normalize(this.searchQuery());
    const items = this.menuService.menuItems();

    if (!query) return items;

    return items.reduce<MenuItem[]>((acc, item) => {
      const parentMatches = this.normalize(item.name).includes(query);

      if (item.children && item.children.length > 0) {
        const matchingChildren = item.children.filter((child) =>
          this.normalize(child.name).includes(query),
        );

        if (parentMatches) {
          acc.push(item);
        } else if (matchingChildren.length > 0) {
          acc.push({ ...item, children: matchingChildren });
        }
      } else if (parentMatches) {
        acc.push(item);
      }

      return acc;
    }, []);
  });

  readonly effectiveExpandedItems = computed(() => {
    const query = this.searchQuery();
    if (!query) return this.expandedItems();

    const normalizedQuery = this.normalize(query);
    const expanded: Record<number, boolean> = { ...this.expandedItems() };

    for (const item of this.menuService.menuItems()) {
      if (item.children && item.children.length > 0) {
        const hasMatchingChild = item.children.some((child) =>
          this.normalize(child.name).includes(normalizedQuery),
        );
        if (hasMatchingChild) expanded[item.id] = true;
      }
    }

    return expanded;
  });

  toggleItem(itemId: number): void {
    if (!this.layoutService.sidebarOpen()) {
      this.layoutService.openSidebar();
      this.expandedItems.update((state) => ({ ...state, [itemId]: true }));
    } else {
      this.expandedItems.update((state) => ({ ...state, [itemId]: !state[itemId] }));
    }
  }

  openSearchAndFocus(): void {
    this.layoutService.openSidebar();
    setTimeout(() => this.searchInputRef()?.nativeElement.focus(), 320);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }
}
