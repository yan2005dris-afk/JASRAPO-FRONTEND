import { Routes } from '@angular/router';
import { adminCapabilityGuard, authGuard, guestGuard } from './core/guards/auth.guard';
import { menuResolver } from './core/guards/menu.resolver';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'auth/invitations/accept',
    loadComponent: () =>
      import('./features/auth/accept-invitation/accept-invitation.component').then(
        (m) => m.AcceptInvitationComponent,
      ),
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
    path: 'app',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayout),
    canActivate: [authGuard],
    resolve: { menu: menuResolver },
    children: [
      {
        path: 'operador',
        data: { breadcrumb: 'Operación en Campo' },
        children: [
          {
            path: 'tareas',
            redirectTo: 'rutas',
            pathMatch: 'full',
          },
          {
            path: 'rutas',
            data: { breadcrumb: 'Rutas' },
            loadComponent: () =>
              import('./features/operator/rutas/rutas.component').then((m) => m.RutasComponent),
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
            redirectTo: 'rutas',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard' },
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },

      // Sección Administración (Solo Admin / Supervisor)
      {
        path: 'admin',
        data: { breadcrumb: 'Administración' },
        canActivate: [adminCapabilityGuard],
        loadComponent: () =>
          import('./features/admin/component/admin.component').then((m) => m.AdminComponent),
        children: [
          {
            path: 'users',
            data: { breadcrumb: 'Usuarios' },
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
                data: { breadcrumb: 'Nuevo Usuario' },
                loadComponent: () =>
                  import('./features/users/user-form/user-form.component').then(
                    (m) => m.UserFormComponent,
                  ),
              },
              {
                path: ':id/edit',
                data: { breadcrumb: 'Editar Usuario' },
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
              import('./features/admin/system-config/system-config.component').then(
                (m) => m.SystemConfigComponent,
              ),
          },
          {
            path: 'empresa',
            data: { breadcrumb: 'Empresa y Sucursales' },
            loadComponent: () =>
              import('./features/admin/company/pages/company-detail/company-detail.component').then(
                (m) => m.CompanyDetailComponent,
              ),
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
              import('./features/contracts/clients/clients.component').then(
                (m) => m.ClientsComponent,
              ),
          },
          {
            path: 'Contratos',
            data: { breadcrumb: 'Contratos de Servicios' },
            loadComponent: () =>
              import('./features/contracts/service-contracts/service-contracts.component').then(
                (m) => m.ServiceContractsComponent,
              ),
          },
          {
            path: 'ConveniosDePago',
            data: { breadcrumb: 'Convenios de Pago' },
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                  import('./features/contracts/payment-agreements/payment-agreements').then(
                    (m) => m.PaymentAgreementsComponent,
                  ),
              },
              {
                path: 'new',
                data: { breadcrumb: 'Nuevo Convenio' },
                loadComponent: () =>
                  import('./features/contracts/payment-agreements/pages/payment-agreement-create/payment-agreement-create.component').then(
                    (m) => m.PaymentAgreementCreateComponent,
                  ),
              },
            ],
          },
          {
            path: 'RutasDeLectura',
            data: { breadcrumb: 'Rutas de Lectura' },
            loadComponent: () =>
              import('./features/contracts/reading-routes/reading-routes').then(
                (m) => m.ReadingRoutesComponent,
              ),
          },
          {
            path: 'RutasDeLectura/:id',
            data: { breadcrumb: 'Detalle de Ruta' },
            loadComponent: () =>
              import('./features/contracts/reading-routes/pages/reading-route-detail/reading-route-detail.component').then(
                (m) => m.ReadingRouteDetailComponent,
              ),
          },
          {
            path: 'LecturaDeConsumo',
            data: { breadcrumb: 'Lectura de Consumo' },
            loadComponent: () =>
              import('./features/contracts/readings/readings').then((m) => m.ReadingsComponent),
          },
          {
            path: 'AnomaliasDeLectura',
            data: { breadcrumb: 'Anomalías de Lectura' },
            loadComponent: () =>
              import('./features/contracts/reading-anomalies/reading-anomalies').then(
                (m) => m.ReadingAnomaliesComponent,
              ),
          },
          {
            path: 'Medidores',
            data: { breadcrumb: 'Medidores' },
            loadComponent: () =>
              import('./features/contracts/meters/components/meters-index/meters-index.component').then(
                (m) => m.MetersIndexComponent,
              ),
          },
          {
            path: 'Medidores/:id/historial',
            data: { breadcrumb: 'Historial de Medidor' },
            loadComponent: () =>
              import('./features/contracts/meters/pages/meter-history-detail/meter-history-detail.component').then(
                (m) => m.MeterHistoryDetailComponent,
              ),
          },
          {
            path: 'TarifasYCategorias',
            data: { breadcrumb: 'Tarifas y Categorías' },
            loadComponent: () =>
              import('./features/contracts/tariffs/tariffs.component').then(
                (m) => m.TariffsComponent,
              ),
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
            data: { breadcrumb: 'Generación de Planillas' },
            loadComponent: () =>
              import('./features/billing/batches/batches').then((m) => m.BatchesComponent),
          },
          {
            path: 'EnvioDeFacturacion/:id',
            data: { breadcrumb: 'Detalle de Lote' },
            loadComponent: () =>
              import('./features/billing/batches/pages/batch-detail/batch-detail.component').then(
                (m) => m.BatchDetailComponent,
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
            data: { breadcrumb: 'Prefacturas' },
            loadComponent: () =>
              import('./features/billing/pre-invoices/pre-invoices').then(
                (m) => m.PreInvoicesComponent,
              ),
          },
          {
            path: 'GeneracionPlanilla/:id',
            data: { breadcrumb: 'Detalle de Prefactura' },
            loadComponent: () =>
              import('./features/billing/pre-invoices/pages/pre-invoice-detail/pre-invoice-detail.component').then(
                (m) => m.PreInvoiceDetailComponent,
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
          {
            path: 'RecaudacionYPagos/RegistrarPago',
            data: { breadcrumb: 'Registrar Pago' },
            loadComponent: () =>
              import('./features/billing/payments/components/payment-form/payment-form.component').then(
                (m) => m.PaymentFormComponent,
              ),
          },
          {
            path: 'RecaudacionYPagos/:id',
            data: { breadcrumb: 'Detalle de Pago' },
            loadComponent: () =>
              import('./features/billing/payments/pages/payment-detail/payment-detail.component').then(
                (m) => m.PaymentDetailComponent,
              ),
          },
          {
            path: 'CuadroDeCaja',
            data: { breadcrumb: 'Cuadro y Cierre de Caja' },
            loadComponent: () =>
              import('./features/billing/cash-sessions/pages/cash-session-detail/cash-session-detail.component').then(
                (m) => m.CashSessionDetailComponent,
              ),
          },
          {
            path: 'Descuentos',
            data: { breadcrumb: 'Descuentos y Beneficios' },
            loadComponent: () =>
              import('./features/billing/discounts/discounts').then((m) => m.DiscountsComponent),
          },
          {
            path: 'Rubros',
            data: { breadcrumb: 'Rubros y Tarifas' },
            loadComponent: () =>
              import('./features/billing/rubros/rubros.component').then((m) => m.RubrosComponent),
          },
        ],
      },

      // Sección Reportes
      {
        path: 'reportes',
        data: { breadcrumb: 'Reportes' },
        children: [
          {
            path: 'consumo-zonas',
            data: { breadcrumb: 'Consumo por Zonas' },
            loadComponent: () =>
              import('./features/reports/zone-consumption/zone-consumption').then(
                (m) => m.ZoneConsumptionComponent,
              ),
          },
          {
            path: 'dashboard',
            data: { breadcrumb: 'Dashboard KPI' },
            loadComponent: () =>
              import('./features/reports/kpi-dashboard/kpi-dashboard').then(
                (m) => m.KpiDashboardComponent,
              ),
          },
          {
            path: 'estado-cuenta',
            data: { breadcrumb: 'Estado de Cuenta' },
            loadComponent: () =>
              import('./features/reports/client-statement/client-statement').then(
                (m) => m.ClientStatementComponent,
              ),
          },
          {
            path: 'recaudacion-morosidad',
            data: { breadcrumb: 'Recaudación y Morosidad' },
            loadComponent: () =>
              import('./features/reports/overdue-accounts/overdue-accounts').then(
                (m) => m.OverdueAccountsComponent,
              ),
          },
          {
            path: 'abonos',
            data: { breadcrumb: 'Reporte de Abonos' },
            loadComponent: () =>
              import('./features/reports/payments-report/payments-report').then(
                (m) => m.PaymentsReportComponent,
              ),
          },
          {
            path: 'historial-conexion',
            data: { breadcrumb: 'Historial de Conexión' },
            loadComponent: () =>
              import('./features/reports/connection-history/connection-history').then(
                (m) => m.ConnectionHistoryComponent,
              ),
          },
          {
            path: 'convenio-pago',
            data: { breadcrumb: 'Convenio de Pago' },
            loadComponent: () =>
              import('./features/reports/payment-agreement/payment-agreement').then(
                (m) => m.PaymentAgreementComponent,
              ),
          },
          {
            path: 'listado-clientes',
            data: { breadcrumb: 'Listado de Clientes' },
            loadComponent: () =>
              import('./features/reports/clients-list/clients-list').then(
                (m) => m.ClientsListComponent,
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
