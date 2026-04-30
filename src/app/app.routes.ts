import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'app',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
      // Sección Administración (Solo Admin)
      {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
      },
      // Sección Presidencia (Admin y Presidente)
      {
        path: 'presidente',
        children: [
          {
            path: 'aprobaciones',
            loadComponent: () =>
              import('./features/presidente/presidente.component/presidente.component').then(
                (m) => m.PresidenteComponent,
              ),
          },
          {
            path: 'reportes',
            loadComponent: () =>
              import('./features/presidente/presidente.component/presidente.component').then(
                (m) => m.PresidenteComponent,
              ),
          },
          {
            path: 'actas',
            loadComponent: () =>
              import('./features/presidente/presidente.component/presidente.component').then(
                (m) => m.PresidenteComponent,
              ),
          },
        ],
      },
      // Sección Secretaría (Admin y Secretario)
      {
        path: 'secretario',
        children: [
          {
            path: 'documentos',
            loadComponent: () =>
              import('./features/secretario/secretario.component/secretario.component').then(
                (m) => m.SecretarioComponent,
              ),
          },
          {
            path: 'correspondencia',
            loadComponent: () =>
              import('./features/secretario/secretario.component/secretario.component').then(
                (m) => m.SecretarioComponent,
              ),
          },
          {
            path: 'archivo',
            loadComponent: () =>
              import('./features/secretario/secretario.component/secretario.component').then(
                (m) => m.SecretarioComponent,
              ),
          },
        ],
      },
      // Sección Tesorería (Admin y Tesorero)
      {
        path: 'tesorero',
        children: [
          {
            path: 'ingresos',
            loadComponent: () =>
              import('./features/tesorero/tesorero.component/tesorero.component').then(
                (m) => m.TesoreroComponent,
              ),
          },
          {
            path: 'egresos',
            loadComponent: () =>
              import('./features/tesorero/tesorero.component/tesorero.component').then(
                (m) => m.TesoreroComponent,
              ),
          },
          {
            path: 'balance',
            loadComponent: () =>
              import('./features/tesorero/tesorero.component/tesorero.component').then(
                (m) => m.TesoreroComponent,
              ),
          },
        ],
      },
      // Sección Contratos
      {
        path: 'Contratos',
        children: [
          {
            path: 'Cliente',
            loadComponent: () =>
              import('./features/Contratos/clientes/clientes').then((m) => m.Clientes),
          },
          {
            path: 'ContratosDeServicios',
            loadComponent: () =>
              import('./features/Contratos/contratos-de-servicios/contratos-de-servicios').then(
                (m) => m.ContratosDeServicios,
              ),
          },
          {
            path: 'ConveniosDePago',
            loadComponent: () =>
              import('./features/Contratos/convenios-de-pago/convenios-de-pago').then(
                (m) => m.ConveniosDePago,
              ),
          },
          {
            path: 'LecturaDeConsumo',
            loadComponent: () =>
              import('./features/Contratos/lectura-de-consumo/lectura-de-consumo').then(
                (m) => m.LecturaDeConsumo,
              ),
          },
          {
            path: 'Medidores',
            loadComponent: () =>
              import('./features/Contratos/medidores/medidores').then((m) => m.Medidores),
          },
          {
            path: 'TarifasYCategorias',
            loadComponent: () =>
              import('./features/Contratos/tarifas-ycategorias/tarifas-ycategorias').then(
                (m) => m.TarifasYCategorias,
              ),
          },
        ],
      },
      // Sección Facturación
      {
        path: 'Facturacion',
        children: [
          {
            path: 'EnvioDeFacturacion',
            loadComponent: () =>
              import('./features/Facturacion/envio-de-facturacion/envio-de-facturacion').then(
                (m) => m.EnvioDeFacturacion,
              ),
          },
          {
            path: 'FacturacionElectronica',
            loadComponent: () =>
              import('./features/Facturacion/facturacion-electronica/facturacion-electronica').then(
                (m) => m.FacturacionElectronica,
              ),
          },
          {
            path: 'GeneracionPlanilla',
            loadComponent: () =>
              import('./features/Facturacion/generacion-planilla/generacion-planilla').then(
                (m) => m.GeneracionPlanilla,
              ),
          },
          {
            path: 'NotasDeCreditoDebito',
            loadComponent: () =>
              import('./features/Facturacion/notas-de-credito-debito/notas-de-credito-debito').then(
                (m) => m.NotasDeCreditoDebito,
              ),
          },
          {
            path: 'RecaudacionYPagos',
            loadComponent: () =>
              import('./features/Facturacion/recaudacion-ypagos/recaudacion-ypagos').then(
                (m) => m.RecaudacionYPagos,
              ),
          },
        ],
      },
      // Sección Reportes
      {
        path: 'Reportes',
        children: [
          {
            path: 'ConsumoZonas',
            loadComponent: () =>
              import('./features/Reportes/consumo-zonas/consumo-zonas').then((m) => m.ConsumoZonas),
          },
          {
            path: 'DashboardKpi',
            loadComponent: () =>
              import('./features/Reportes/dashboard-kpi/dashboard-kpi').then((m) => m.DashboardKpi),
          },
          {
            path: 'EstadoCuentaCliente',
            loadComponent: () =>
              import('./features/Reportes/estado-cuenta-cliente/estado-cuenta-cliente').then(
                (m) => m.EstadoCuentaCliente,
              ),
          },
          {
            path: 'RecaudacionMorosida',
            loadComponent: () =>
              import('./features/Reportes/recaudacion-morosida/recaudacion-morosida').then(
                (m) => m.RecaudacionMorosida,
              ),
          },
        ],
      },
      // Otras secciones comunes
      {
        path: 'water-sources',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
