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

    // 3. Verificar que se renderizan las tarjetas de rutas
    const taskCards = page.locator('.task-card, .map-task-row');
    await expect(taskCards.first()).toBeVisible({ timeout: 10000 });

    // 4. Verificar existencia de las tabs del footer y logout en header
    await expect(page.locator('#tab-rutas')).toBeVisible();
    await expect(page.locator('#tab-ordenes')).toBeVisible();
    await expect(page.locator('#tab-novedades')).toBeVisible();
    await expect(page.locator('#tab-sincronizar')).toBeVisible();
    await expect(page.locator('#btn-header-logout')).toBeVisible();

    // 5. Navegar a la pantalla de toma de lecturas
    await page.goto('/app/operador/lecturas');
    await expect(page).toHaveURL(/\/app\/operador\/lecturas/, { timeout: 10000 });

    // 6. Verificar que IndexedDB se pobló y los medidores aparecen en pantalla
    const meterCard = page.locator('app-meter-card, .meter-card-item');
    await expect(meterCard.first()).toBeVisible({ timeout: 15000 });

    // 7. Inspeccionar directamente IndexedDB del navegador
    const cachedCount = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        const req = indexedDB.open('jasrapo-operator-db', 6);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('medidores_cache')) {
            resolve(0);
            return;
          }
          const tx = db.transaction('medidores_cache', 'readonly');
          const countReq = tx.objectStore('medidores_cache').count();
          countReq.onsuccess = () => resolve(countReq.result);
          countReq.onerror = () => resolve(0);
        };
        req.onerror = () => resolve(0);
      });
    });

    expect(cachedCount).toBeGreaterThan(0);
  });
});
