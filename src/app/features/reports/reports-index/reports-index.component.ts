import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IReportNavigationGroup } from '../shared/models/report-workspace.model';
import { ReportHeaderComponent } from '../shared/report-header/report-header.component';

export const REPORT_NAVIGATION_GROUPS: readonly IReportNavigationGroup[] = [
  {
    title: 'Reportes operativos',
    reports: [
      {
        title: 'Estado de Cuenta',
        description: 'Emisiones, abonos y saldo de un contrato.',
        route: '/app/reportes/estado-cuenta',
        icon: 'bi bi-receipt',
      },
      {
        title: 'Reporte de Abonos',
        description: 'Pagos registrados por cliente y período.',
        route: '/app/reportes/abonos',
        icon: 'bi bi-cash-coin',
      },
      {
        title: 'Historial de Conexión',
        description: 'Emisiones, consumos y pagos de un contrato.',
        route: '/app/reportes/historial-conexion',
        icon: 'bi bi-clock-history',
      },
      {
        title: 'Convenio de Pago',
        description: 'Condiciones vigentes de un convenio autorizado.',
        route: '/app/reportes/convenio-pago',
        icon: 'bi bi-file-earmark-check',
      },
    ],
  },
  {
    title: 'Reportes administrativos',
    reports: [
      {
        title: 'Listado de Clientes',
        description: 'Padrón de clientes según estado y fecha de ingreso.',
        route: '/app/reportes/listado-clientes',
        icon: 'bi bi-people',
      },
    ],
  },
];

@Component({
  selector: 'app-reports-index',
  imports: [RouterLink, ReportHeaderComponent],
  templateUrl: './reports-index.component.html',
  styleUrl: './reports-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsIndexComponent {
  readonly groups = REPORT_NAVIGATION_GROUPS;
}
