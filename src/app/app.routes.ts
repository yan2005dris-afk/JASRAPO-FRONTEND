import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
        canActivate: [guestGuard]
    },
    {
        path: 'app',
        loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayout),
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard)
            },
            // Sección Administración (Solo Admin)
            {
                path: 'admin',
                loadComponent: () => import('./features/admin/admin.component/admin.component').then(m => m.AdminComponent),
                children: [
                    {
                        path: 'users',
                        loadComponent: () => import('./features/users/user-management/user-management').then(m => m.UserManagement)
                    },
                    {
                        path: 'roles',
                        loadComponent: () => import('./features/admin/admin.component/admin.component').then(m => m.AdminComponent)
                    },
                    {
                        path: 'config',
                        loadComponent: () => import('./features/admin/admin.component/admin.component').then(m => m.AdminComponent)
                    }
                ]
            },
            // Sección Presidencia (Admin y Presidente)
            {
                path: 'presidente',
                children: [
                    {
                        path: 'aprobaciones',
                        loadComponent: () => import('./features/presidente/presidente.component/presidente.component').then(m => m.PresidenteComponent)
                    },
                    {
                        path: 'reportes',
                        loadComponent: () => import('./features/presidente/presidente.component/presidente.component').then(m => m.PresidenteComponent)
                    },
                    {
                        path: 'actas',
                        loadComponent: () => import('./features/presidente/presidente.component/presidente.component').then(m => m.PresidenteComponent)
                    }
                ]
            },
            // Sección Secretaría (Admin y Secretario)
            {
                path: 'secretario',
                children: [
                    {
                        path: 'documentos',
                        loadComponent: () => import('./features/secretario/secretario.component/secretario.component').then(m => m.SecretarioComponent)
                    },
                    {
                        path: 'correspondencia',
                        loadComponent: () => import('./features/secretario/secretario.component/secretario.component').then(m => m.SecretarioComponent)
                    },
                    {
                        path: 'archivo',
                        loadComponent: () => import('./features/secretario/secretario.component/secretario.component').then(m => m.SecretarioComponent)
                    }
                ]
            },
            // Sección Tesorería (Admin y Tesorero)
            {
                path: 'tesorero',
                children: [
                    {
                        path: 'ingresos',
                        loadComponent: () => import('./features/tesorero/tesorero.component/tesorero.component').then(m => m.TesoreroComponent)
                    },
                    {
                        path: 'egresos',
                        loadComponent: () => import('./features/tesorero/tesorero.component/tesorero.component').then(m => m.TesoreroComponent)
                    },
                    {
                        path: 'balance',
                        loadComponent: () => import('./features/tesorero/tesorero.component/tesorero.component').then(m => m.TesoreroComponent)
                    }
                ]
            },
            // Otras secciones comunes
            {
                path: 'water-sources',
                loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard)
            },
            {
                path: 'billing',
                loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard)
            },
            {
                path: 'reports',
                loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    }
];
