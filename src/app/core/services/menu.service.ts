import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MenuItem } from '../models/menu.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly http = inject(HttpClient);
  // Eliminamos el inject de AuthService porque no se estaba usando
  private readonly API_URL = `${environment.apiUrl}/menus`;

  // Signal que almacena el menú recibido del backend
  private readonly menuItemsSignal = signal<MenuItem[]>([]);

  // Computed para exponer el menú de forma reactiva
  readonly menuItems = computed(() => this.menuItemsSignal());

  /**
   * Obtiene el menú desde el backend
   * El backend ya envía el menú filtrado según el rol del usuario
   */
  getMenuFromBackend(): Observable<MenuItem[]> {
    // El interceptor de autenticación se encarga de añadir el token automáticamente
    return this.http.get<MenuItem[]>(`${this.API_URL}/my`, { withCredentials: true }).pipe(
      map((menu) => this.formatRoutes(menu)),
      tap((menu) => {
        this.menuItemsSignal.set(menu);
      }),
    );
  }

  /**
   * Asegura que todas las rutas del menú comiencen con el prefijo /app y enriquece metadata responsive
   */
  private formatRoutes(items: MenuItem[]): MenuItem[] {
    return items.map((item) => {
      const formattedItem = { ...item };

      if (formattedItem.route && !formattedItem.route.startsWith('/app')) {
        const prefix = formattedItem.route.startsWith('/') ? '/app' : '/app/';
        formattedItem.route = `${prefix}${formattedItem.route}`;
      }

      this.enrichMetadata(formattedItem);

      if (formattedItem.children && formattedItem.children.length > 0) {
        formattedItem.children = this.formatRoutes(formattedItem.children);
      }

      return formattedItem;
    });
  }

  /**
   * Asigna metadata por defecto a rutas conocidas para vista responsive y contextos operativos
   */
  private enrichMetadata(item: MenuItem): void {
    const route = item.route ?? '';

    // Rutas operativas de campo
    if (route.includes('/operador/rutas') || route.endsWith('/rutas')) {
      item.context = 'operator';
      item.showInBottomNav = true;
      item.bottomNavOrder = 10;
      if (!item.icon) item.icon = 'bi-map-fill';
    } else if (route.includes('/operador/lecturas') || route.includes('/LecturaDeConsumo')) {
      item.context = item.route?.includes('/operador') ? 'operator' : 'admin';
      if (item.route?.includes('/operador')) {
        item.showInBottomNav = true;
        item.bottomNavOrder = 20;
      }
      if (!item.icon) item.icon = 'bi-card-checklist';
    } else if (route.includes('/operador/novedades')) {
      item.context = 'operator';
      item.showInBottomNav = true;
      item.bottomNavOrder = 30;
      if (!item.icon) item.icon = 'bi-exclamation-triangle';
    } else if (route.includes('/operador/sincronizar')) {
      item.context = 'operator';
      item.showInBottomNav = true;
      item.bottomNavOrder = 40;
      item.badgeSignalKey = 'syncQueued';
      if (!item.icon) item.icon = 'bi-cloud-arrow-up';
    } else if (route.endsWith('/dashboard')) {
      item.context = 'common';
      item.showInBottomNav = true;
      item.bottomNavOrder = 1;
      if (!item.icon) item.icon = 'bi-speedometer2';
    } else {
      item.context = item.context ?? 'admin';
    }
  }

  /**
   * Limpia el menú almacenado (útil en logout)
   */
  clearMenu(): void {
    this.menuItemsSignal.set([]);
  }
}
