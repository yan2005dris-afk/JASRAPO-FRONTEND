import { test, expect } from '@playwright/test';

test.describe('PWA Operador - Sincronización y Rutas', () => {
  test('Login como operador y carga de rutas / tareas', async ({ page }) => {
    // 1. Ir a login
    await page.goto('/login');
    await page.getByLabel('Usuario').fill('operadores@jasrapo.com');
    await page.getByLabel('contraseña').fill('Operadores123#');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    // 2. Esperar redirección al layout de operador
    await expect(page).toHaveURL(/\/app\/operador\/rutas/, { timeout: 15000 });

    // 3. Verificar existencia de las tabs del footer y logout en header
    await expect(page.locator('#tab-rutas')).toBeVisible();
    await expect(page.locator('#tab-ordenes')).toBeVisible();
    await expect(page.locator('#tab-novedades')).toBeVisible();
    await expect(page.locator('#tab-sincronizar')).toBeVisible();
    await expect(page.locator('#btn-header-logout')).toBeVisible();

    // 4. Descargar explícitamente los datos asignados
    await page.goto('/app/operador/sincronizar');
    await expect(page.getByRole('heading', { name: 'Cola de Sincronización' })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: 'Descargar / Actualizar Datos' }).click();

    const downloadSuccess = page
      .getByRole('alert')
      .filter({ hasText: /Datos descargados con éxito/ });
    await expect(downloadSuccess).toContainText(
      /Datos descargados con éxito: [1-9]\d* rutas, [1-9]\d* medidores y [1-9]\d* lecturas\./,
      { timeout: 30000 },
    );

    // 5. Verificar que los medidores aparecen en la pantalla de toma de lecturas
    await page.goto('/app/operador/lecturas');
    await expect(page).toHaveURL(/\/app\/operador\/lecturas/, { timeout: 10000 });
    const meterCard = page.locator('app-meter-card, .meter-card-item');
    await expect(meterCard.first()).toBeVisible({ timeout: 15000 });
  });

  test('Descarga el manifiesto asignado y muestra datos disponibles', async ({ page }) => {
    const manifestRequests: string[] = [];
    const legacySyncRequests: string[] = [];

    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/api/v1/operator/sync/manifest') manifestRequests.push(request.url());
      if (pathname === '/api/v1/operator/sync') legacySyncRequests.push(request.url());
    });

    await page.goto('/login');
    await page.getByLabel('Usuario').fill('operadores@jasrapo.com');
    await page.getByLabel('contraseña').fill('Operadores123#');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page).toHaveURL(/\/app\/operador\/rutas/, { timeout: 15000 });

    await page.goto('/app/operador/sincronizar');
    await expect(page.getByRole('heading', { name: 'Cola de Sincronización' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: 'Descargar / Actualizar Datos' }).click();

    const downloadSuccess = page
      .getByRole('alert')
      .filter({ hasText: /Datos descargados con éxito/ });
    await expect(downloadSuccess).toContainText(
      /Datos descargados con éxito: [1-9]\d* rutas, [1-9]\d* medidores y [1-9]\d* lecturas\./,
      { timeout: 30000 },
    );

    expect(manifestRequests.length).toBeGreaterThan(0);
    expect(legacySyncRequests).toHaveLength(0);

    await page.goto('/app/operador/rutas');
    await expect(page).toHaveURL(/\/app\/operador\/rutas/);
    await expect(page.getByRole('heading', { name: 'Mis Rutas' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('.task-card, .map-task-row').first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole('alert').filter({ hasText: /routes:read|autorización/i }),
    ).toHaveCount(0);
  });
});
