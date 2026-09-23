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

test.describe('E2E Operador - Vista de Rutas y Filtros Geográficos', () => {
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
      localStorage.setItem('jasrapo_token', 'mock-jwt-token');
      localStorage.setItem('currentUser', JSON.stringify(user));
    }, MOCK_USER);
  });

  test('Renderiza los nombres reales de Comunidad y Sector en las tarjetas de ruta', async ({ page }) => {
    await page.goto('/app/operador/rutas');
    await expect(page).toHaveURL(/\/app\/operador\/rutas/);

    // 1. Validar que las tarjetas de rutas estén visibles
    const taskCards = page.locator('.task-card');
    await expect(taskCards).toHaveCount(2);

    // 2. Validar que la primera ruta muestre "Comunidad: Olón" y "Sector: Sector Norte Olón"
    const firstCard = taskCards.first();
    await expect(firstCard).toContainText('Olón');
    await expect(firstCard).toContainText('Sector Norte Olón');
    await expect(firstCard).not.toContainText('Comunidad #1');
    await expect(firstCard).not.toContainText('Sector #1');

    // 3. Validar que la segunda ruta muestre "Comunidad: Núñez"
    const secondCard = taskCards.nth(1);
    await expect(secondCard).toContainText('Núñez');
    await expect(secondCard).not.toContainText('Comunidad #2');
  });

  test('Los dropdowns de filtros muestran los nombres reales de Comunidad y Sector', async ({ page }) => {
    await page.goto('/app/operador/rutas');

    // 1. Selector de Comunidad
    const selectComunidad = page.locator('select[aria-label="Filtrar por comunidad"]');
    await expect(selectComunidad).toBeVisible();

    const comunidadOptions = await selectComunidad.locator('option').allInnerTexts();
    expect(comunidadOptions).toContain('Todas las comunidades');
    expect(comunidadOptions).toContain('Olón');
    expect(comunidadOptions).toContain('Núñez');
    expect(comunidadOptions.some((opt) => opt.includes('Comunidad #'))).toBe(false);

    // 2. Selector de Sector
    const selectSector = page.locator('select[aria-label="Filtrar por sector"]');
    await expect(selectSector).toBeVisible();

    const sectorOptions = await selectSector.locator('option').allInnerTexts();
    expect(sectorOptions).toContain('Todos los sectores');
    expect(sectorOptions).toContain('Sector Norte Olón');
    expect(sectorOptions.some((opt) => opt.includes('Sector #'))).toBe(false);
  });

  test('El filtrado por Comunidad y Sector actualiza las rutas visibles en la UI', async ({ page }) => {
    await page.goto('/app/operador/rutas');

    const selectComunidad = page.locator('select[aria-label="Filtrar por comunidad"]');
    const taskCards = page.locator('.task-card');

    // Filtrar por "Olón" (valor "1")
    await selectComunidad.selectOption('1');
    await expect(taskCards).toHaveCount(1);
    await expect(taskCards.first()).toContainText('Ruta Olón Norte');

    // Filtrar por "Núñez" (valor "2")
    await selectComunidad.selectOption('2');
    await expect(taskCards).toHaveCount(1);
    await expect(taskCards.first()).toContainText('Ruta Reconexión Núñez');

    // Restaurar a "Todas las comunidades"
    await selectComunidad.selectOption('ALL');
    await expect(taskCards).toHaveCount(2);
  });

  test('La vista de Mapa conmuta y lista las rutas con información legible', async ({ page }) => {
    await page.goto('/app/operador/rutas');

    // Conmutar a mapa
    const btnMap = page.locator('button.btn-map-toggle');
    await btnMap.click();

    // Validar contenedor de mapa y lista de rutas en mapa
    await expect(page.locator('.map-section')).toBeVisible();
    await expect(page.locator('.map-task-list')).toBeVisible();

    const mapRows = page.locator('.map-task-row');
    await expect(mapRows).toHaveCount(2);
    await expect(mapRows.first()).toContainText('Ruta Olón Norte');
  });
});
