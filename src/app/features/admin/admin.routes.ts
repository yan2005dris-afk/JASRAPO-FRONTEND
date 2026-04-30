import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin.component/admin.component').then((m) => m.AdminComponent),
    children: [
      {
        path: 'users',
        loadComponent: () =>
          import('../users/user-management/user-management').then((m) => m.UserManagement),
      },
      {
        path: 'roles',
        loadComponent: () => import('./roles/roles').then((m) => m.Roles),
        children: [
          {
            path: 'presidente',
            loadComponent: () =>
              import('../presidente/presidente.component/presidente.component').then(
                (m) => m.PresidenteComponent,
              ),
          },
          {
            path: 'secretario',
            loadComponent: () =>
              import('../secretario/secretario.component/secretario.component').then(
                (m) => m.SecretarioComponent,
              ),
          },
          {
            path: 'tesorero',
            loadComponent: () =>
              import('../tesorero/tesorero.component/tesorero.component').then(
                (m) => m.TesoreroComponent,
              ),
          },
        ],
      },
      {
        path: 'comunidades',
        loadComponent: () =>
          import('./comunidades/comunidades.component').then(
            (m) => m.ComunidadesComponent,
          ),
      },
      {
        path: 'sectores',
        loadComponent: () =>
          import('./sectores-prueba/components/sectores-prueba/sectores-prueba').then(
            (m) => m.SectoresPrueba,
          ),
      },
      {
        path: 'config',
        redirectTo: '',
        pathMatch: 'full',
      },
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full',
      },
    ],
  },
];
