import { MenuItem } from '../models/menu.model';
import { filterUnavailableReportMenuItems } from './report-route-availability';

describe('report route availability', () => {
  it('filters unfinished destinations from nested backend menus', () => {
    const reports: MenuItem = {
      id: 1,
      name: 'Reportes',
      menu_order: 1,
      is_active: true,
      children: [
        {
          id: 2,
          name: 'Estado de Cuenta',
          route: '/app/reportes/estado-cuenta',
          menu_order: 1,
          is_active: true,
        },
        {
          id: 3,
          name: 'Consumo por Zonas',
          route: '/app/reportes/consumo-zonas',
          menu_order: 2,
          is_active: true,
        },
      ],
    };

    const result = filterUnavailableReportMenuItems([reports]);

    expect(result[0].children?.map((item) => item.route)).toEqual(['/app/reportes/estado-cuenta']);
  });

  it('drops route-less parents when recursive filtering removes every child', () => {
    const result = filterUnavailableReportMenuItems([
      {
        id: 1,
        name: 'Reportes pendientes',
        menu_order: 1,
        is_active: true,
        children: [
          {
            id: 2,
            name: 'Consumo por Zonas',
            route: '/app/reportes/consumo-zonas',
            menu_order: 1,
            is_active: true,
          },
          {
            id: 3,
            name: 'Dashboard KPI',
            route: '/app/reportes/dashboard',
            menu_order: 2,
            is_active: true,
          },
        ],
      },
    ]);

    expect(result).toEqual([]);
  });

  it('keeps a routable parent when all unfinished children are removed', () => {
    const result = filterUnavailableReportMenuItems([
      {
        id: 1,
        name: 'Índice de reportes',
        route: '/app/reportes',
        menu_order: 1,
        is_active: true,
        children: [
          {
            id: 2,
            name: 'Dashboard KPI',
            route: '/app/reportes/dashboard',
            menu_order: 1,
            is_active: true,
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        id: 1,
        name: 'Índice de reportes',
        route: '/app/reportes',
        menu_order: 1,
        is_active: true,
        children: undefined,
      },
    ]);
  });
});
