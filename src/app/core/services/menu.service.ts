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
    private readonly API_URL = `${environment.apiUrl}/menu`;

    // Signal que almacena el menú recibido del backend
    private readonly menuItemsSignal = signal<MenuItem[]>([]);

    // Computed para exponer el menú de forma reactiva
    readonly menuItems = computed(() => this.menuItemsSignal());

    /**
     * Obtiene el menú desde el backend
     * El backend ya envía el menú filtrado según el rol del usuario
     */
    getMenuFromBackend(): Observable<MenuItem[]> {
        // ============================================
        // SIMULACIÓN - SOLO PARA DESARROLLO
        // ============================================
        const user = this.authService.currentUser();
        
        // Menús mock según roleId (estructura coincide con backend)
        const menusByRole: Record<number, MenuItem[]> = {
            // roleId 1: Admin (acceso completo)
            1: [
                {
                    id: 1,
                    name: 'Dashboard',
                    icon: 'bi-speedometer2',
                    route: '/features/dashboard',
                    menu_order: 1,
                    is_active: true
                },
                {
                    id: 2,
                    name: 'Administración',
                    icon: 'bi-gear-fill',
                    menu_order: 2,
                    is_active: true,
                    children: [
                        {
                            id: 21,
                            name: 'Gestión de Usuarios',
                            route: '/features/admin/users',
                            parent_menu_id: 2,
                            menu_order: 1,
                            is_active: true
                        },
                        {
                            id: 22,
                            name: 'Roles y Permisos',
                            route: '/features/admin/roles',
                            parent_menu_id: 2,
                            menu_order: 2,
                            is_active: true
                        },
                        {
                            id: 23,
                            name: 'Configuración',
                            route: '/features/admin/config',
                            parent_menu_id: 2,
                            menu_order: 3,
                            is_active: true
                        }
                    ]
                },
                {
                    id: 3,
                    name: 'Presidencia',
                    icon: 'bi-person-badge-fill',
                    menu_order: 3,
                    is_active: true,
                    children: [
                        {
                            id: 31,
                            name: 'Aprobaciones',
                            route: '/features/presidente/aprobaciones',
                            parent_menu_id: 3,
                            menu_order: 1,
                            is_active: true
                        },
                        {
                            id: 32,
                            name: 'Reportes Ejecutivos',
                            route: '/features/presidente/reportes',
                            parent_menu_id: 3,
                            menu_order: 2,
                            is_active: true
                        },
                        {
                            id: 33,
                            name: 'Actas de Reunión',
                            route: '/features/presidente/actas',
                            parent_menu_id: 3,
                            menu_order: 3,
                            is_active: true
                        }
                    ]
                },
                {
                    id: 4,
                    name: 'Secretaría',
                    icon: 'bi-file-earmark-text-fill',
                    menu_order: 4,
                    is_active: true,
                    children: [
                        {
                            id: 41,
                            name: 'Documentos',
                            route: '/features/secretario/documentos',
                            parent_menu_id: 4,
                            menu_order: 1,
                            is_active: true
                        },
                        {
                            id: 42,
                            name: 'Correspondencia',
                            route: '/features/secretario/correspondencia',
                            parent_menu_id: 4,
                            menu_order: 2,
                            is_active: true
                        },
                        {
                            id: 43,
                            name: 'Archivo General',
                            route: '/features/secretario/archivo',
                            parent_menu_id: 4,
                            menu_order: 3,
                            is_active: true
                        }
                    ]
                },
                {
                    id: 5,
                    name: 'Tesorería',
                    icon: 'bi-cash-coin',
                    menu_order: 5,
                    is_active: true,
                    children: [
                        {
                            id: 51,
                            name: 'Ingresos',
                            route: '/features/tesorero/ingresos',
                            parent_menu_id: 5,
                            menu_order: 1,
                            is_active: true
                        },
                        {
                            id: 52,
                            name: 'Egresos',
                            route: '/features/tesorero/egresos',
                            parent_menu_id: 5,
                            menu_order: 2,
                            is_active: true
                        },
                        {
                            id: 53,
                            name: 'Balance General',
                            route: '/features/tesorero/balance',
                            parent_menu_id: 5,
                            menu_order: 3,
                            is_active: true
                        }
                    ]
                },
                {
                    id: 6,
                    name: 'Fuentes de Agua',
                    icon: 'bi-droplet-fill',
                    route: '/features/water-sources',
                    menu_order: 6,
                    is_active: true
                },
                {
                    id: 7,
                    name: 'Facturación',
                    icon: 'bi-receipt',
                    route: '/features/billing',
                    menu_order: 7,
                    is_active: true
                },
                {
                    id: 8,
                    name: 'Reportes',
                    icon: 'bi-file-bar-graph',
                    route: '/features/reports',
                    menu_order: 8,
                    is_active: true
                }
            ],
            // roleId 2: Presidente
            2: [
                {
                    id: 1,
                    name: 'Dashboard',
                    icon: 'bi-speedometer2',
                    route: '/features/dashboard',
                    menu_order: 1,
                    is_active: true
                },
                {
                    id: 3,
                    name: 'Presidencia',
                    icon: 'bi-person-badge-fill',
                    menu_order: 2,
                    is_active: true,
                    children: [
                        {
                            id: 31,
                            name: 'Aprobaciones',
                            route: '/features/presidente/aprobaciones',
                            parent_menu_id: 3,
                            menu_order: 1,
                            is_active: true
                        },
                        {
                            id: 32,
                            name: 'Reportes Ejecutivos',
                            route: '/features/presidente/reportes',
                            parent_menu_id: 3,
                            menu_order: 2,
                            is_active: true
                        },
                        {
                            id: 33,
                            name: 'Actas de Reunión',
                            route: '/features/presidente/actas',
                            parent_menu_id: 3,
                            menu_order: 3,
                            is_active: true
                        }
                    ]
                },
                {
                    id: 8,
                    name: 'Reportes',
                    icon: 'bi-file-bar-graph',
                    route: '/features/reports',
                    menu_order: 3,
                    is_active: true
                }
            ],
            // roleId 3: Secretario
            3: [
                {
                    id: 1,
                    name: 'Dashboard',
                    icon: 'bi-speedometer2',
                    route: '/features/dashboard',
                    menu_order: 1,
                    is_active: true
                },
                {
                    id: 4,
                    name: 'Secretaría',
                    icon: 'bi-file-earmark-text-fill',
                    menu_order: 2,
                    is_active: true,
                    children: [
                        {
                            id: 41,
                            name: 'Documentos',
                            route: '/features/secretario/documentos',
                            parent_menu_id: 4,
                            menu_order: 1,
                            is_active: true
                        },
                        {
                            id: 42,
                            name: 'Correspondencia',
                            route: '/features/secretario/correspondencia',
                            parent_menu_id: 4,
                            menu_order: 2,
                            is_active: true
                        },
                        {
                            id: 43,
                            name: 'Archivo General',
                            route: '/features/secretario/archivo',
                            parent_menu_id: 4,
                            menu_order: 3,
                            is_active: true
                        }
                    ]
                },
                {
                    id: 6,
                    name: 'Fuentes de Agua',
                    icon: 'bi-droplet-fill',
                    route: '/features/water-sources',
                    menu_order: 3,
                    is_active: true
                }
            ],
            // roleId 4: Tesorero
            4: [
                {
                    id: 1,
                    name: 'Dashboard',
                    icon: 'bi-speedometer2',
                    route: '/features/dashboard',
                    menu_order: 1,
                    is_active: true
                },
                {
                    id: 5,
                    name: 'Tesorería',
                    icon: 'bi-cash-coin',
                    menu_order: 2,
                    is_active: true,
                    children: [
                        {
                            id: 51,
                            name: 'Ingresos',
                            route: '/features/tesorero/ingresos',
                            parent_menu_id: 5,
                            menu_order: 1,
                            is_active: true
                        },
                        {
                            id: 52,
                            name: 'Egresos',
                            route: '/features/tesorero/egresos',
                            parent_menu_id: 5,
                            menu_order: 2,
                            is_active: true
                        },
                        {
                            id: 53,
                            name: 'Balance General',
                            route: '/features/tesorero/balance',
                            parent_menu_id: 5,
                            menu_order: 3,
                            is_active: true
                        }
                    ]
                },
                {
                    id: 7,
                    name: 'Facturación',
                    icon: 'bi-receipt',
                    route: '/features/billing',
                    menu_order: 3,
                    is_active: true
                },
                {
                    id: 8,
                    name: 'Reportes',
                    icon: 'bi-file-bar-graph',
                    route: '/features/reports',
                    menu_order: 4,
                    is_active: true
                }
            ]
        };

        const mockMenu = user ? menusByRole[user.roleId] || [] : [];

        return of(mockMenu).pipe(
            delay(500), // Simula latencia de red
            tap(menu => this.menuItemsSignal.set(menu))
        );

        // ============================================
        // CÓDIGO REAL PARA BACKEND
        // Descomentar cuando el backend esté listo
        // ============================================
        // return this.http.get<MenuItem[]>(
        //     `${this.API_URL}`,
        //     { withCredentials: true }
        // ).pipe(
        //     tap(menu => this.menuItemsSignal.set(menu))
        // );
    }

    /**
     * Limpia el menú almacenado (útil en logout)
     */
    clearMenu(): void {
        this.menuItemsSignal.set([]);
    }
}
