import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { MenuItem } from '../models/menu.model';

@Injectable({
    providedIn: 'root'
})
export class MenuService {
    private readonly authService = inject(AuthService);

    // Configuración completa del menú (simula respuesta del backend)
    private readonly menuConfig: MenuItem[] = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: 'bi-speedometer2',
            route: '/app/dashboard',
            roles: ['Admin', 'Presidente', 'Secretario', 'Tesorero']
        },
        {
            id: 'admin',
            label: 'Administración',
            icon: 'bi-gear-fill',
            roles: ['Admin'],
            children: [
                {
                    id: 'admin-users',
                    label: 'Gestión de Usuarios',
                    route: '/app/admin/users',
                    roles: ['Admin']
                },
                {
                    id: 'admin-roles',
                    label: 'Roles y Permisos',
                    route: '/app/admin/roles',
                    roles: ['Admin']
                },
                {
                    id: 'admin-config',
                    label: 'Configuración',
                    route: '/app/admin/config',
                    roles: ['Admin']
                }
            ]
        },
        {
            id: 'presidente',
            label: 'Presidencia',
            icon: 'bi-person-badge-fill',
            roles: ['Admin', 'Presidente'],
            children: [
                {
                    id: 'presidente-aprobaciones',
                    label: 'Aprobaciones',
                    route: '/app/presidente/aprobaciones',
                    roles: ['Admin', 'Presidente']
                },
                {
                    id: 'presidente-reportes',
                    label: 'Reportes Ejecutivos',
                    route: '/app/presidente/reportes',
                    roles: ['Admin', 'Presidente']
                },
                {
                    id: 'presidente-actas',
                    label: 'Actas de Reunión',
                    route: '/app/presidente/actas',
                    roles: ['Admin', 'Presidente']
                }
            ]
        },
        {
            id: 'secretario',
            label: 'Secretaría',
            icon: 'bi-file-earmark-text-fill',
            roles: ['Admin', 'Secretario'],
            children: [
                {
                    id: 'secretario-documentos',
                    label: 'Documentos',
                    route: '/app/secretario/documentos',
                    roles: ['Admin', 'Secretario']
                },
                {
                    id: 'secretario-correspondencia',
                    label: 'Correspondencia',
                    route: '/app/secretario/correspondencia',
                    roles: ['Admin', 'Secretario']
                },
                {
                    id: 'secretario-archivo',
                    label: 'Archivo General',
                    route: '/app/secretario/archivo',
                    roles: ['Admin', 'Secretario']
                }
            ]
        },
        {
            id: 'tesorero',
            label: 'Tesorería',
            icon: 'bi-cash-coin',
            roles: ['Admin', 'Tesorero'],
            children: [
                {
                    id: 'tesorero-ingresos',
                    label: 'Ingresos',
                    route: '/app/tesorero/ingresos',
                    roles: ['Admin', 'Tesorero']
                },
                {
                    id: 'tesorero-egresos',
                    label: 'Egresos',
                    route: '/app/tesorero/egresos',
                    roles: ['Admin', 'Tesorero']
                },
                {
                    id: 'tesorero-balance',
                    label: 'Balance General',
                    route: '/app/tesorero/balance',
                    roles: ['Admin', 'Tesorero']
                }
            ]
        },
        {
            id: 'water-sources',
            label: 'Fuentes de Agua',
            icon: 'bi-droplet-fill',
            route: '/app/water-sources',
            roles: ['Admin', 'Secretario']
        },
        {
            id: 'billing',
            label: 'Facturación',
            icon: 'bi-receipt',
            route: '/app/billing',
            roles: ['Admin', 'Tesorero']
        },
        {
            id: 'reports',
            label: 'Reportes',
            icon: 'bi-file-bar-graph',
            route: '/app/reports',
            roles: ['Admin', 'Presidente', 'Tesorero']
        }
    ];

    /**
     * Obtiene el menú filtrado según el rol del usuario actual
     */
    readonly menuItems = computed(() => {
        const user = this.authService.currentUser();
        
        if (!user) {
            return [];
        }

        return this.filterMenuByRole(this.menuConfig, user.role);
    });

    /**
     * Filtra los items del menú según el rol del usuario
     */
    private filterMenuByRole(items: MenuItem[], userRole: string): MenuItem[] {
        return items
            .filter(item => item.roles.includes(userRole))
            .map(item => {
                if (item.children) {
                    return {
                        ...item,
                        children: this.filterMenuByRole(item.children, userRole)
                    };
                }
                return item;
            })
            .filter(item => !item.children || item.children.length > 0);
    }

    /**
     * Simula obtener el menú desde el backend
     * En producción, esto haría una petición HTTP
     */
    getMenuFromBackend(userRole: string): MenuItem[] {
        // Simular delay de red
        return this.filterMenuByRole(this.menuConfig, userRole);
    }
}
