import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
        canActivate: [guestGuard]
    },
    {
        path: 'consulta-planilla',
        loadComponent: () => import('./features/consulta-planilla/consulta-planilla.component').then(m => m.ConsultaPlanillaComponent)
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
                loadComponent: () => import('./features/admin/admin-section.component').then(m => m.AdminSectionComponent),
                children: [
                    {
                        path: 'users',
                        loadComponent: () => import('./features/users/user-management/user-management').then(m => m.UserManagement)
                    },
                    {
                        path: 'roles',
                        loadComponent: () => import('./features/admin/admin-section.component').then(m => m.AdminSectionComponent)
                    },
                    {
                        path: 'config',
                        loadComponent: () => import('./features/admin/admin-section.component').then(m => m.AdminSectionComponent)
                    }
                ]
            },
            // Sección Presidencia (Admin y Presidente)
            {
                path: 'presidente',
                children: [
                    {
                        path: 'aprobaciones',
                        loadComponent: () => import('./features/presidente/presidente-section.component').then(m => m.PresidenteSectionComponent)
                    },
                    {
                        path: 'reportes',
                        loadComponent: () => import('./features/presidente/presidente-section.component').then(m => m.PresidenteSectionComponent)
                    },
                    {
                        path: 'actas',
                        loadComponent: () => import('./features/presidente/presidente-section.component').then(m => m.PresidenteSectionComponent)
                    }
                ]
            },
            // Sección Secretaría (Admin y Secretario)
            {
                path: 'secretario',
                children: [
                    {
                        path: 'documentos',
                        loadComponent: () => import('./features/secretario/secretario-section.component').then(m => m.SecretarioSectionComponent)
                    },
                    {
                        path: 'correspondencia',
                        loadComponent: () => import('./features/secretario/secretario-section.component').then(m => m.SecretarioSectionComponent)
                    },
                    {
                        path: 'archivo',
                        loadComponent: () => import('./features/secretario/secretario-section.component').then(m => m.SecretarioSectionComponent)
                    }
                ]
            },
            // Sección Tesorería (Admin y Tesorero)
            {
                path: 'tesorero',
                children: [
                    {
                        path: 'ingresos',
                        loadComponent: () => import('./features/tesorero/tesorero-section.component').then(m => m.TesoreroSectionComponent)
                    },
                    {
                        path: 'egresos',
                        loadComponent: () => import('./features/tesorero/tesorero-section.component').then(m => m.TesoreroSectionComponent)
                    },
                    {
                        path: 'balance',
                        loadComponent: () => import('./features/tesorero/tesorero-section.component').then(m => m.TesoreroSectionComponent)
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
        redirectTo: 'consulta-planilla',
        pathMatch: 'full'
    }
];
