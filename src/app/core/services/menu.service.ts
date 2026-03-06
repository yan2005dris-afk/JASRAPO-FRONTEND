import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { MenuItem } from '../models/menu.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class MenuService {
    private readonly http = inject(HttpClient);
    private readonly authService = inject(AuthService);
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
        // El interceptor de autenticación se encarga de añadir el token
        return this.http.get<MenuItem[]>(
            `${this.API_URL}/my`,
            { withCredentials: true }
        ).pipe(
            map(menu => this.formatRoutes(menu)),
            tap(menu => {
                // console.log('>>> Menús recibidos del backend:', menu);
                this.menuItemsSignal.set(menu);
            })
        );
    }

    private formatRoutes(items: MenuItem[]): MenuItem[] {
        return items.map(item => {
            const formattedItem = { ...item };
            if (formattedItem.route && !formattedItem.route.startsWith('/app')) {
                // Ensure it starts with /app
                formattedItem.route = formattedItem.route.startsWith('/')
                    ? `/app${formattedItem.route}`
                    : `/app/${formattedItem.route}`;
            }
            if (formattedItem.children && formattedItem.children.length > 0) {
                formattedItem.children = this.formatRoutes(formattedItem.children);
            }
            return formattedItem;
        });
    }

    /**
     * Limpia el menú almacenado (útil en logout)
     */
    clearMenu(): void {
        this.menuItemsSignal.set([]);
    }
}
