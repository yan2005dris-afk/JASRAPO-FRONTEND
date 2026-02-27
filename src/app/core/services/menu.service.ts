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
        
        // Menús mock según roleId
        const menusByRole: Record<number, MenuItem[]> = {
            // roleId 1: Admin (acceso completo)
            1: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: 'bi-speedometer2',
                    route: '/app/dashboard'
                },
                {
                    id: 'admin',
                    label: 'Administración',
                    icon: 'bi-gear-fill',
                    children: [
                        {
                            id: 'admin-users',
                            label: 'Gestión de Usuarios',
                            route: '/app/admin/users'
                        },
                        {
                            id: 'admin-roles',
                            label: 'Roles y Permisos',
                            route: '/app/admin/roles'
                        },
                        {
                            id: 'admin-config',
                            label: 'Configuración',
                            route: '/app/admin/config'
                        }
                    ]
                },
                {
                    id: 'presidente',
                    label: 'Presidencia',
                    icon: 'bi-person-badge-fill',
                    children: [
                        {
                            id: 'presidente-aprobaciones',
                            label: 'Aprobaciones',
                            route: '/app/presidente/aprobaciones'
                        },
                        {
                            id: 'presidente-reportes',
                            label: 'Reportes Ejecutivos',
                            route: '/app/presidente/reportes'
                        },
                        {
                            id: 'presidente-actas',
                            label: 'Actas de Reunión',
                            route: '/app/presidente/actas'
                        }
                    ]
                },
                {
                    id: 'secretario',
                    label: 'Secretaría',
                    icon: 'bi-file-earmark-text-fill',
                    children: [
                        {
                            id: 'secretario-documentos',
                            label: 'Documentos',
                            route: '/app/secretario/documentos'
                        },
                        {
                            id: 'secretario-correspondencia',
                            label: 'Correspondencia',
                            route: '/app/secretario/correspondencia'
                        },
                        {
                            id: 'secretario-archivo',
                            label: 'Archivo General',
                            route: '/app/secretario/archivo'
                        }
                    ]
                },
                {
                    id: 'tesorero',
                    label: 'Tesorería',
                    icon: 'bi-cash-coin',
                    children: [
                        {
                            id: 'tesorero-ingresos',
                            label: 'Ingresos',
                            route: '/app/tesorero/ingresos'
                        },
                        {
                            id: 'tesorero-egresos',
                            label: 'Egresos',
                            route: '/app/tesorero/egresos'
                        },
                        {
                            id: 'tesorero-balance',
                            label: 'Balance General',
                            route: '/app/tesorero/balance'
                        }
                    ]
                },
                {
                    id: 'water-sources',
                    label: 'Fuentes de Agua',
                    icon: 'bi-droplet-fill',
                    route: '/app/water-sources'
                },
                {
                    id: 'billing',
                    label: 'Facturación',
                    icon: 'bi-receipt',
                    route: '/app/billing'
                },
                {
                    id: 'reports',
                    label: 'Reportes',
                    icon: 'bi-file-bar-graph',
                    route: '/app/reports'
                }
            ],
            // roleId 2: Presidente
            2: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: 'bi-speedometer2',
                    route: '/app/dashboard'
                },
                {
                    id: 'presidente',
                    label: 'Presidencia',
                    icon: 'bi-person-badge-fill',
                    children: [
                        {
                            id: 'presidente-aprobaciones',
                            label: 'Aprobaciones',
                            route: '/app/presidente/aprobaciones'
                        },
                        {
                            id: 'presidente-reportes',
                            label: 'Reportes Ejecutivos',
                            route: '/app/presidente/reportes'
                        },
                        {
                            id: 'presidente-actas',
                            label: 'Actas de Reunión',
                            route: '/app/presidente/actas'
                        }
                    ]
                },
                {
                    id: 'reports',
                    label: 'Reportes',
                    icon: 'bi-file-bar-graph',
                    route: '/app/reports'
                }
            ],
            // roleId 3: Secretario
            3: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: 'bi-speedometer2',
                    route: '/app/dashboard'
                },
                {
                    id: 'secretario',
                    label: 'Secretaría',
                    icon: 'bi-file-earmark-text-fill',
                    children: [
                        {
                            id: 'secretario-documentos',
                            label: 'Documentos',
                            route: '/app/secretario/documentos'
                        },
                        {
                            id: 'secretario-correspondencia',
                            label: 'Correspondencia',
                            route: '/app/secretario/correspondencia'
                        },
                        {
                            id: 'secretario-archivo',
                            label: 'Archivo General',
                            route: '/app/secretario/archivo'
                        }
                    ]
                },
                {
                    id: 'water-sources',
                    label: 'Fuentes de Agua',
                    icon: 'bi-droplet-fill',
                    route: '/app/water-sources'
                }
            ],
            // roleId 4: Tesorero
            4: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: 'bi-speedometer2',
                    route: '/app/dashboard'
                },
                {
                    id: 'tesorero',
                    label: 'Tesorería',
                    icon: 'bi-cash-coin',
                    children: [
                        {
                            id: 'tesorero-ingresos',
                            label: 'Ingresos',
                            route: '/app/tesorero/ingresos'
                        },
                        {
                            id: 'tesorero-egresos',
                            label: 'Egresos',
                            route: '/app/tesorero/egresos'
                        },
                        {
                            id: 'tesorero-balance',
                            label: 'Balance General',
                            route: '/app/tesorero/balance'
                        }
                    ]
                },
                {
                    id: 'billing',
                    label: 'Facturación',
                    icon: 'bi-receipt',
                    route: '/app/billing'
                },
                {
                    id: 'reports',
                    label: 'Reportes',
                    icon: 'bi-file-bar-graph',
                    route: '/app/reports'
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
