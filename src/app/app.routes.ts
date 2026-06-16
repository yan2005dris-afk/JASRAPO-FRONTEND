import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { menuResolver } from './core/guards/menu.resolver';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'consulta-planilla',
    loadComponent: () =>
      import('./features/bill-inquiry/bill-inquiry.component').then((m) => m.BillInquiryComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'app',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    resolve: { menu: menuResolver },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },

      // Sección Administración (Solo Admin)
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/component/admin.component').then((m) => m.AdminComponent),
        children: [
          {
            path: 'users',
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                  import('./features/users/user-management/user-management').then(
                    (m) => m.UserManagement,
                  ),
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./features/users/user-form/user-form.component').then(
                    (m) => m.UserFormComponent,
                  ),
              },
              {
                path: ':id/edit',
                loadComponent: () =>
                  import('./features/users/user-form/user-form.component').then(
                    (m) => m.UserFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'roles',
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./features/admin/roles/roles').then((m) => m.Roles),
              },
              {
                path: ':rolId',
                loadComponent: () =>
                  import('./features/admin/roles/role-editor/role-editor').then(
                    (m) => m.RoleEditor,
                  ),
              },
            ],
          },
          {
            path: 'sectores',
            loadComponent: () =>
              import('./features/admin/sectores-prueba/components/sectores-prueba/sectores-prueba').then(
                (m) => m.SectoresPrueba,
              ),
          },
          {
            path: 'comunidades',
            loadComponent: () =>
              import('./features/admin/comunidades/comunidades.component').then(
                (m) => m.ComunidadesComponent,
              ),
          },
          {
            path: 'roles',
            loadComponent: () =>
              import('./features/admin/roles/roles.component').then((m) => m.RolesComponent),
            children: [
              {
                path: ':rolId',
                loadComponent: () =>
                  import('./features/admin/roles/role-editor/role-editor.component').then(
                    (m) => m.RoleEditorComponent,
                  ),
              },
            ],
          },
          {
            path: 'config',
            loadComponent: () =>
              import('./features/admin/component/admin.component').then((m) => m.AdminComponent),
          },
        ],
      },

      // Sección Presidencia (Admin y Presidente)
      {
        path: 'presidente',
        children: [
          {
            path: 'aprobaciones',
            loadComponent: () =>
              import('./features/president/president.component/president.component').then(
                (m) => m.PresidentComponent,
              ),
          },
          {
            path: 'reportes',
            loadComponent: () =>
              import('./features/president/president.component/president.component').then(
                (m) => m.PresidentComponent,
              ),
          },
          {
            path: 'actas',
            loadComponent: () =>
              import('./features/president/president.component/president.component').then(
                (m) => m.PresidentComponent,
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
              import('./features/secretary/secretary.component/secretary.component').then(
                (m) => m.SecretaryComponent,
              ),
          },
          {
            path: 'correspondencia',
            loadComponent: () =>
              import('./features/secretary/secretary.component/secretary.component').then(
                (m) => m.SecretaryComponent,
              ),
          },
          {
            path: 'archivo',
            loadComponent: () =>
              import('./features/secretary/secretary.component/secretary.component').then(
                (m) => m.SecretaryComponent,
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
              import('./features/treasurer/treasurer.component/treasurer.component').then(
                (m) => m.TreasurerComponent,
              ),
          },
          {
            path: 'egresos',
            loadComponent: () =>
              import('./features/treasurer/treasurer.component/treasurer.component').then(
                (m) => m.TreasurerComponent,
              ),
          },
          {
            path: 'balance',
            loadComponent: () =>
              import('./features/treasurer/treasurer.component/treasurer.component').then(
                (m) => m.TreasurerComponent,
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
              import('./features/contracts/clients/clients').then((m) => m.ClientsComponent),
          },
          {
            path: 'ContratosDeServicios',
            loadComponent: () =>
              import('./features/contracts/service-contracts/service-contracts').then(
                (m) => m.ServiceContractsComponent,
              ),
          },
          {
            path: 'ConveniosDePago',
            loadComponent: () =>
              import('./features/contracts/payment-agreements/payment-agreements').then(
                (m) => m.PaymentAgreementsComponent,
              ),
          },
          {
            path: 'LecturaDeConsumo',
            loadComponent: () =>
              import('./features/contracts/readings/readings').then((m) => m.ReadingsComponent),
          },
          {
            path: 'Medidores',
            loadComponent: () =>
              import('./features/contracts/meters/meters').then((m) => m.MetersComponent),
          },
          {
            path: 'TarifasYCategorias',
            loadComponent: () =>
              import('./features/contracts/tariffs/tariffs').then((m) => m.TariffsComponent),
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
              import('./features/billing/billing-submission/billing-submission').then(
                (m) => m.BillingSubmissionComponent,
              ),
          },
          {
            path: 'FacturacionElectronica',
            loadComponent: () =>
              import('./features/billing/electronic-billing/electronic-billing').then(
                (m) => m.ElectronicBillingComponent,
              ),
          },
          {
            path: 'GeneracionPlanilla',
            loadComponent: () =>
              import('./features/billing/billing-generation/billing-generation').then(
                (m) => m.BillingGenerationComponent,
              ),
          },
          {
            path: 'NotasDeCreditoDebito',
            loadComponent: () =>
              import('./features/billing/credit-debit-notes/credit-debit-notes').then(
                (m) => m.CreditDebitNotesComponent,
              ),
          },
          {
            path: 'RecaudacionYPagos',
            loadComponent: () =>
              import('./features/billing/payments/payments').then((m) => m.PaymentsComponent),
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
              import('./features/reports/zone-consumption/zone-consumption').then(
                (m) => m.ZoneConsumptionComponent,
              ),
          },
          {
            path: 'DashboardKpi',
            loadComponent: () =>
              import('./features/reports/kpi-dashboard/kpi-dashboard').then(
                (m) => m.KpiDashboardComponent,
              ),
          },
          {
            path: 'EstadoCuentaCliente',
            loadComponent: () =>
              import('./features/reports/client-statement/client-statement').then(
                (m) => m.ClientStatementComponent,
              ),
          },
          {
            path: 'RecaudacionMorosida',
            loadComponent: () =>
              import('./features/reports/overdue-accounts/overdue-accounts').then(
                (m) => m.OverdueAccountsComponent,
              ),
          },
        ],
      },

      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },

      // Otras secciones comunes
      {
        path: 'water-sources',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'Facturacion',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'Reportes',
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
    redirectTo: 'consulta-planilla',
    pathMatch: 'full',
  },
];
