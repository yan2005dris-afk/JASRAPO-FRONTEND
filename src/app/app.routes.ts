import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: '',
        loadComponent: () => import('./core/layout/main-layout/main-layout').then(m => m.MainLayout),
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
