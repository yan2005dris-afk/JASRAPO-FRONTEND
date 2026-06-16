import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./component/admin.component').then((m) => m.AdminComponent),
    children: [
      {
        path: 'users',
        loadComponent: () =>
          import('../users/user-management/user-management.component').then((m) => m.UserManagementComponent),
      },
      {
        path: 'comunidades',
        loadComponent: () =>
          import('./comunidades/comunidades.component').then((m) => m.ComunidadesComponent),
      },
      {
        path: 'sectores',
        loadComponent: () =>
          import('./sectores-prueba/components/sectores-prueba/sectores-prueba').then(
            (m) => m.SectoresPrueba,
          ),
      },
      {
        path: 'roles',
        loadComponent: () => import('./roles/roles.component').then((m) => m.RolesComponent),
        children: [
          {
            path: ':rolId',
            loadComponent: () =>
              import('./roles/role-editor/role-editor.component').then(
                (m) => m.RoleEditorComponent,
              ),
          },
        ],
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
