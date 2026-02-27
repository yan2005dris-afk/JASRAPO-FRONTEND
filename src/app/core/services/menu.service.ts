import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
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
            tap(menu => this.menuItemsSignal.set(menu))
        );
    }

    /**
     * Limpia el menú almacenado (útil en logout)
     */
    clearMenu(): void {
        this.menuItemsSignal.set([]);
    }
}
