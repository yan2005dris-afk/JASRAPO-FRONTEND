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
    canActivate: [guestGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/bill-inquiry/bill-inquiry.component').then(
            (m) => m.BillInquiryComponent,
          ),
      },
      {
        path: 'preview',
        loadComponent: () =>
          import('./features/consulta-planilla/preview-planilla/preview-planilla.component').then(
            (m) => m.PreviewPlanillaComponent,
          ),
      },
    ],
  },
  {
    path: 'app/operador',
    loadComponent: () =>
      import('./layout/operator-layout/operator-layout.component').then(
        (m) => m.OperatorLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'tareas',
        data: { breadcrumb: 'Tareas' },
        loadComponent: () =>
          import('./features/operator/tasks/tasks.component').then((m) => m.TasksComponent),
      },
      {
        path: 'lecturas',
        data: { breadcrumb: 'Lecturas' },
        loadComponent: () =>
          import('./features/operator/readings/lecturas.component').then(
            (m) => m.LecturasComponent,
          ),
      },
      {
        path: 'novedades',
        data: { breadcrumb: 'Novedades' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./features/operator/novelties/novedades.component').then(
                (m) => m.NovedadesComponent,
              ),
          },
          {
            path: 'new',
            data: { breadcrumb: 'Nueva Novedad' },
            loadComponent: () =>
              import('./features/operator/novelties/novedades-form/novedades-form.component').then(
                (m) => m.NovedadesFormComponent,
              ),
          },
        ],
      },
      {
        path: 'sincronizar',
        data: { breadcrumb: 'Sincronizar' },
        loadComponent: () =>
          import('./features/operator/sync-queue/sincronizar.component').then(
            (m) => m.SincronizarComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'tareas',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'app',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayout),
    canActivate: [authGuard],
    resolve: { menu: menuResolver },
    children: [
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard' },
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },

      // Sección Administración (Solo Admin)
      {
        path: 'admin',
        data: { breadcrumb: 'Administración' },
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
                  import('./features/users/user-management/user-management.component').then(
                    (m) => m.UserManagementComponent,
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
            path: 'sectores',
            data: { breadcrumb: 'Sectores' },
            loadComponent: () =>
              import('./features/admin/sectores-prueba/components/sectores-prueba/sectores-prueba').then(
                (m) => m.SectoresPrueba,
              ),
          },
          {
            path: 'comunidades',
            data: { breadcrumb: 'Comunidades' },
            loadComponent: () =>
              import('./features/admin/comunidades/comunidades.component').then(
                (m) => m.ComunidadesComponent,
              ),
          },
          {
            path: 'roles',
            data: { breadcrumb: 'Roles' },
            loadComponent: () =>
              import('./features/admin/roles/roles.component').then((m) => m.RolesComponent),
            children: [
              {
                path: ':rolId',
                data: { breadcrumb: 'Editor de Rol' },
                loadComponent: () =>
                  import('./features/admin/roles/role-editor/role-editor.component').then(
                    (m) => m.RoleEditorComponent,
                  ),
              },
            ],
          },
          {
            path: 'config',
            data: { breadcrumb: 'Configuración' },
            loadComponent: () =>
              import('./features/admin/component/admin.component').then((m) => m.AdminComponent),
          },
        ],
      },

      // Sección Presidencia (Admin y Presidente)
      {
        path: 'presidente',
        data: { breadcrumb: 'Presidencia' },
        children: [
          {
            path: 'aprobaciones',
            data: { breadcrumb: 'Aprobaciones' },
            loadComponent: () =>
              import('./features/president/president.component/president.component').then(
                (m) => m.PresidentComponent,
              ),
          },
          {
            path: 'reportes',
            data: { breadcrumb: 'Reportes' },
            loadComponent: () =>
              import('./features/president/president.component/president.component').then(
                (m) => m.PresidentComponent,
              ),
          },
          {
            path: 'actas',
            data: { breadcrumb: 'Actas' },
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
        data: { breadcrumb: 'Secretaría' },
        children: [
          {
            path: 'documentos',
            data: { breadcrumb: 'Documentos' },
            loadComponent: () =>
              import('./features/secretary/secretary.component/secretary.component').then(
                (m) => m.SecretaryComponent,
              ),
          },
          {
            path: 'correspondencia',
            data: { breadcrumb: 'Correspondencia' },
            loadComponent: () =>
              import('./features/secretary/secretary.component/secretary.component').then(
                (m) => m.SecretaryComponent,
              ),
          },
          {
            path: 'archivo',
            data: { breadcrumb: 'Archivo' },
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
        data: { breadcrumb: 'Tesorería' },
        children: [
          {
            path: 'ingresos',
            data: { breadcrumb: 'Ingresos' },
            loadComponent: () =>
              import('./features/treasurer/treasurer.component/treasurer.component').then(
                (m) => m.TreasurerComponent,
              ),
          },
          {
            path: 'egresos',
            data: { breadcrumb: 'Egresos' },
            loadComponent: () =>
              import('./features/treasurer/treasurer.component/treasurer.component').then(
                (m) => m.TreasurerComponent,
              ),
          },
          {
            path: 'balance',
            data: { breadcrumb: 'Balance' },
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
        data: { breadcrumb: 'Contratos' },
        children: [
          {
            path: 'Cliente',
            data: { breadcrumb: 'Clientes' },
            loadComponent: () =>
              import('./features/contracts/clients/clients').then((m) => m.ClientsComponent),
          },
          {
            path: 'ContratosDeServicios',
            data: { breadcrumb: 'Contratos de Servicios' },
            loadComponent: () =>
              import('./features/contracts/service-contracts/service-contracts').then(
                (m) => m.ServiceContractsComponent,
              ),
          },
          {
            path: 'ConveniosDePago',
            data: { breadcrumb: 'Convenios de Pago' },
            loadComponent: () =>
              import('./features/contracts/payment-agreements/payment-agreements').then(
                (m) => m.PaymentAgreementsComponent,
              ),
          },
          {
            path: 'LecturaDeConsumo',
            data: { breadcrumb: 'Lectura de Consumo' },
            loadComponent: () =>
              import('./features/contracts/readings/readings').then((m) => m.ReadingsComponent),
          },
          {
            path: 'Medidores',
            data: { breadcrumb: 'Medidores' },
            loadComponent: () =>
              import('./features/contracts/meters/meters').then((m) => m.MetersComponent),
          },
          {
            path: 'TarifasYCategorias',
            data: { breadcrumb: 'Tarifas y Categorías' },
            loadComponent: () =>
              import('./features/contracts/tariffs/tariffs').then((m) => m.TariffsComponent),
          },
        ],
      },

      // Sección Facturación
      {
        path: 'Facturacion',
        data: { breadcrumb: 'Facturación' },
        children: [
          {
            path: 'EnvioDeFacturacion',
            data: { breadcrumb: 'Envío de Facturación' },
            loadComponent: () =>
              import('./features/billing/billing-submission/billing-submission').then(
                (m) => m.BillingSubmissionComponent,
              ),
          },
          {
            path: 'FacturacionElectronica',
            data: { breadcrumb: 'Facturación Electrónica' },
            loadComponent: () =>
              import('./features/billing/electronic-billing/electronic-billing').then(
                (m) => m.ElectronicBillingComponent,
              ),
          },
          {
            path: 'GeneracionPlanilla',
            data: { breadcrumb: 'Generación de Planilla' },
            loadComponent: () =>
              import('./features/billing/billing-generation/billing-generation').then(
                (m) => m.BillingGenerationComponent,
              ),
          },
          {
            path: 'NotasDeCreditoDebito',
            data: { breadcrumb: 'Notas de Crédito/Débito' },
            loadComponent: () =>
              import('./features/billing/credit-debit-notes/credit-debit-notes').then(
                (m) => m.CreditDebitNotesComponent,
              ),
          },
          {
            path: 'RecaudacionYPagos',
            data: { breadcrumb: 'Recaudación y Pagos' },
            loadComponent: () =>
              import('./features/billing/payments/payments').then((m) => m.PaymentsComponent),
          },
        ],
      },

      // Sección Reportes
      {
        path: 'Reportes',
        data: { breadcrumb: 'Reportes' },
        children: [
          {
            path: 'ConsumoZonas',
            data: { breadcrumb: 'Consumo por Zonas' },
            loadComponent: () =>
              import('./features/reports/zone-consumption/zone-consumption').then(
                (m) => m.ZoneConsumptionComponent,
              ),
          },
          {
            path: 'DashboardKpi',
            data: { breadcrumb: 'Dashboard KPI' },
            loadComponent: () =>
              import('./features/reports/kpi-dashboard/kpi-dashboard').then(
                (m) => m.KpiDashboardComponent,
              ),
          },
          {
            path: 'EstadoCuentaCliente',
            data: { breadcrumb: 'Estado de Cuenta' },
            loadComponent: () =>
              import('./features/reports/client-statement/client-statement').then(
                (m) => m.ClientStatementComponent,
              ),
          },
          {
            path: 'RecaudacionMorosida',
            data: { breadcrumb: 'Recaudación y Morosidad' },
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
          import('./features/dashboard/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'Facturacion',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'Reportes',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
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
  // Catch-all para 404
  {
    path: '**',
    loadComponent: () =>
      import('./features/error/error-page/error-page.component').then((m) => m.ErrorPageComponent),
  },
];
