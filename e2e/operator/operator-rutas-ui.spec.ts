import { test, expect } from '@playwright/test';

const MOCK_ROUTES = [
  {
    rutaId: '101',
    tipoRuta: 'TOMA_LECTURA',
    nombre: 'Ruta Olón Norte',
    descripcion: 'Sector Norte Olón',
    estado: 'PENDIENTE',
    operarioId: 10,
    comunidadId: 1,
    comunidadNombre: 'Olón',
    sectorId: 1,
    sectorNombre: 'Sector Norte Olón',
    fechaPlanificada: '2026-09-23T08:00:00.000Z',
    medidor: null,
    operario: { usuarioId: 10, nombres: 'Carlos', apellidos: 'Mora' },
    paradas: [
      {
        ordenTrabajoId: '1001',
        tipoActividad: 'LECTURA',
        estado: 'PENDIENTE',
        latitud: -1.798,
        longitud: -80.758,
        serie: 'MED-OLON-001',
        clienteNombre: 'Juan Perez',
        direccionSuministro: 'Av. Principal Olón',
      },
    ],
    ordenesTrabajo: [],
  },
  {
    rutaId: '102',
    tipoRuta: 'RECONEXION',
    nombre: 'Ruta Reconexión Núñez',
    descripcion: 'Comunidad Núñez',
    estado: 'EN_PROGRESO',
    operarioId: 10,
    comunidadId: 2,
    comunidadNombre: 'Núñez',
    sectorId: null,
    sectorNombre: null,
    fechaPlanificada: '2026-09-23T09:00:00.000Z',
    medidor: null,
    operario: { usuarioId: 10, nombres: 'Carlos', apellidos: 'Mora' },
    paradas: [
      {
        ordenTrabajoId: '1002',
        tipoActividad: 'RECONEXION',
        estado: 'EN_PROGRESO',
        latitud: -1.81,
        longitud: -80.76,
        serie: 'MED-NUNEZ-002',
        clienteNombre: 'Maria Santos',
        direccionSuministro: 'Calle Central Núñez',
      },
    ],
    ordenesTrabajo: [],
  },
];

const MOCK_USER = {
  id: 10,
  email: 'operadores@jasrapo.com',
  name: 'Carlos Mora',
  roleName: 'operadores',
  roles: ['operadores'],
  permissions: [
    'routes:read',
    'routes:update',
    'readings:read',
    'readings:update',
    'operator-sync:read',
  ],
};

test.describe('E2E Operador - Comunidad → rutas por sector', () => {
  test.beforeEach(async ({ page }) => {
    // Interceptar llamadas de autenticación y rutas del operador
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      });
    });

    await page.route('**/api/v1/operator/routes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROUTES),
      });
    });

    await page.route('**/api/v1/operator/readings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Simular sesión iniciada
    await page.addInitScript((user) => {
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify(user));
    }, MOCK_USER);
  });

  test('muestra comunidades y después las rutas agrupadas por sector', async ({ page }) => {
    await page.goto('/app/operador/rutas');
    await expect(page).toHaveURL(/\/app\/operador\/rutas/);
    await expect(
      page.getByRole('heading', { name: 'Comunidades con trabajo asignado' }),
    ).toBeVisible();
    await expect(page.locator('.route-group-card')).toHaveCount(2);
    await expect(page.locator('.task-card')).toHaveCount(0);

    await page.getByRole('button', { name: /Abrir comunidad Olón/ }).click();
    await expect(page.locator('.route-sector-section')).toHaveCount(1);
    await expect(page.locator('.route-sector-section')).toContainText('Sector Norte Olón');
    await expect(page.locator('.task-card')).toHaveCount(1);
    await expect(page.locator('.task-card')).toContainText('Ruta Olón Norte');
    await expect(page.locator('.task-card')).not.toContainText('Ruta Reconexión Núñez');
  });

  test('muestra las rutas de Núñez directamente y permite volver a comunidades', async ({
    page,
  }) => {
    await page.goto('/app/operador/rutas');
    await page.getByRole('button', { name: /Abrir comunidad Núñez/ }).click();
    await expect(page.locator('.route-sector-heading')).toHaveCount(0);
    await expect(page.getByText('Sin Sector')).toHaveCount(0);
    await expect(page.locator('.task-card')).toHaveCount(1);
    await expect(page.locator('.task-card')).toContainText('Ruta Reconexión Núñez');
    await page
      .getByRole('navigation', { name: 'Ubicación en rutas asignadas' })
      .getByRole('button', { name: 'Comunidades' })
      .click();
    await expect(page.locator('.route-group-card')).toHaveCount(2);
  });

  test('respeta el orden y los nombres de las cinco comunidades y los cuatro sectores de Olón', async ({
    page,
  }) => {
    const olon = MOCK_ROUTES[0];
    const other = MOCK_ROUTES[1];
    const routes = [
      { ...olon, comunidadNombre: 'Olon' },
      {
        ...olon,
        rutaId: '201',
        comunidadNombre: 'Olon',
        sectorId: 2,
        sectorNombre: 'Sector Sur Olón',
      },
      {
        ...olon,
        rutaId: '202',
        comunidadNombre: 'Olon',
        sectorId: 3,
        sectorNombre: 'Sector Centro Olón',
      },
      {
        ...olon,
        rutaId: '203',
        comunidadNombre: 'Olon',
        sectorId: 4,
        sectorNombre: 'Sector Playa Olón',
      },
      { ...other, comunidadNombre: 'Nuñez' },
      { ...other, rutaId: '204', comunidadId: 3, comunidadNombre: 'La Entrada' },
      { ...other, rutaId: '205', comunidadId: 4, comunidadNombre: 'San Jose' },
      { ...other, rutaId: '206', comunidadId: 5, comunidadNombre: 'Curia' },
    ];
    await page.route('**/api/v1/operator/routes*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(routes) }),
    );
    await page.goto('/app/operador/rutas');
    await expect(page.locator('.route-group-content strong')).toHaveText([
      'Olon',
      'Nuñez',
      'La Entrada',
      'San Jose',
      'Curia',
    ]);
    await page.getByRole('button', { name: /Abrir comunidad Olon/ }).click();
    await expect(page.locator('.route-sector-heading h3')).toHaveText([
      'Sector Norte Olón',
      'Sector Sur Olón',
      'Sector Centro Olón',
      'Sector Playa Olón',
    ]);
    await expect(page.locator('.task-card')).toHaveCount(4);
  });

  test('filtra comunidades por tipo antes de navegar', async ({ page }) => {
    await page.goto('/app/operador/rutas');
    await page
      .getByRole('group', { name: 'Filtrar rutas por tipo' })
      .getByRole('button', { name: 'Reconexión' })
      .click();
    await expect(page.locator('.route-group-card')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Abrir comunidad Núñez/ })).toBeVisible();
  });

  test('permite abrir el mapa tras elegir una comunidad', async ({ page }) => {
    await page.goto('/app/operador/rutas');
    await page.getByRole('button', { name: /Abrir comunidad Olón/ }).click();
    await page.getByRole('button', { name: 'Ver mapa' }).click();
    await expect(page.locator('.map-section')).toBeVisible();
    await expect(page.locator('.map-task-list')).toBeVisible();
    await expect(page.locator('.map-task-row')).toHaveCount(1);
    await expect(page.locator('.map-task-row')).toContainText('Ruta Olón Norte');
  });
});
