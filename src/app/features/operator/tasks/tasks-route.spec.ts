import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../../app.routes';

describe('tasks route', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    }).compileComponents();
    router = TestBed.inject(Router);
  });

  it('the route /app/operador/tareas exists in the router config', () => {
    const operatorRoutes = router.config.find((r) => r.path === 'app/operador');
    expect(operatorRoutes).toBeDefined();

    const children = operatorRoutes?.children ?? [];
    const tasksRoute = children.find((r) => r.path === 'tareas');
    expect(tasksRoute).toBeDefined();
  });

  it('the tasks route uses a loadComponent function', () => {
    const operatorRoutes = router.config.find((r) => r.path === 'app/operador');
    const children = operatorRoutes?.children ?? [];
    const tasksRoute = children.find((r) => r.path === 'tareas');

    expect(typeof tasksRoute?.loadComponent).toBe('function');
  });
});
