import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { routes } from '../../../app.routes';
import { UNFINISHED_REPORT_ROUTES } from '../../../core/constants/report-route-availability';
import { REPORT_NAVIGATION_GROUPS, ReportsIndexComponent } from './reports-index.component';

describe('ReportsIndexComponent', () => {
  it('reportNavigationGroupsOnlyAvailableDestinations', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsIndexComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReportsIndexComponent);
    fixture.detectChanges();

    const configuredRoutes = REPORT_NAVIGATION_GROUPS.flatMap((group) =>
      group.reports.map((report) => report.route),
    );
    expect(configuredRoutes).not.toContain('/app/reportes/consumo-zonas');
    expect(configuredRoutes).not.toContain('/app/reportes/dashboard');
    expect(configuredRoutes).not.toContain('/app/reportes/recaudacion-morosidad');

    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a[href]'), (link) =>
      link.getAttribute('href'),
    );
    expect(links).toHaveLength(configuredRoutes.length);
    expect(links).toContain('/app/reportes/estado-cuenta');
    expect(links).toContain('/app/reportes/listado-clientes');
  });

  it('unfinishedReportRoutesAreNotActionable', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const reportsRoute = appRoute?.children?.find((route) => route.path === 'reportes');
    const configuredReportPaths = new Set(
      reportsRoute?.children?.map((route) => `/app/reportes/${route.path}`) ?? [],
    );

    for (const route of UNFINISHED_REPORT_ROUTES) {
      expect(configuredReportPaths.has(route)).toBe(false);
    }
  });
});
