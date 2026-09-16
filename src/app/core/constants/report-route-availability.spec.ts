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
});
