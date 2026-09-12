import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { AuthService } from '../../core/services/auth.service';
import { MenuItem } from '../../core/models/menu.model';

@Component({
  selector: 'app-bottom-nav',
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  private readonly menuService = inject(MenuService);
  readonly syncService = inject(OperatorSyncService);
  private readonly authService = inject(AuthService);

  readonly bottomNavItems = computed<MenuItem[]>(() => {
    const isOp = this.authService.isOperator();
    const items = this.menuService.menuItems();

    // Extraer todos los ítems planos
    const flattened: MenuItem[] = [];
    const walk = (nodes: MenuItem[]) => {
      for (const node of nodes) {
        if (node.route) flattened.push(node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(items);

    // Filtrar los que tienen showInBottomNav
    const eligible = flattened.filter((item) => item.showInBottomNav);

    // Si no hay ninguno configurado explícitamente y es operador, fallback a rutas conocidas
    if (eligible.length === 0 && isOp) {
      return [
        { id: 101, name: 'Rutas', route: '/app/operador/rutas', icon: 'bi-map-fill', menu_order: 1, is_active: true },
        { id: 102, name: 'Órdenes', route: '/app/operador/lecturas', icon: 'bi-card-checklist', menu_order: 2, is_active: true },
        { id: 103, name: 'Novedades', route: '/app/operador/novedades', icon: 'bi-exclamation-triangle', menu_order: 3, is_active: true },
        { id: 104, name: 'Sync', route: '/app/operador/sincronizar', icon: 'bi-cloud-arrow-up', menu_order: 4, is_active: true, badgeSignalKey: 'syncQueued' },
      ];
    }

    return eligible.sort((a, b) => (a.bottomNavOrder ?? 99) - (b.bottomNavOrder ?? 99)).slice(0, 5);
  });
}
