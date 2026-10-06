import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { LoginPage } from '../base-page';

/**
 * Step definitions for `e2e/login/login.feature`.
 *
 * Estrategia pedagógica (intencional, NO producción):
 *   - Cada paso del escenario Gherkin tiene su propio step acá. NO colapsamos
 *     "navegar + tipear + click" en un solo `Given` "estoy logueado", porque
 *     el objetivo de la capacitación es que los muchachos vean el mapeo 1:1
 *     entre el lenguaje natural y el código.
 *   - Reusamos `LoginPage` (POM) desde `base-page.ts` para mantener los
 *     selectores en un único lugar. Si mañana cambia un selector, basta con
 *     tocar `e2e/base-page.ts` y todos los escenarios Gherkin se actualizan.
 *   - Los steps son GENÉRICOS (`debería ver el campo "{string}"`) para que
 *     sirvan en cualquier feature. Si en el futuro aparecen colisiones, el
 *     equipo debe renombrarlos a algo más específico, p.ej.
 *     `debería ver el campo "{string}" del formulario de login`.
 */

const { When, Then } = createBdd();

// ---- Navegación -----------------------------------------------------------

When('navego a {string}', async ({ page }, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
});

// ---- Interacción con el formulario ---------------------------------------

When('ingreso {string} en el campo {string}', async ({ page }, value: string, label: string) => {
  // El POM encapsula los inputs del login. Si el label matchea uno conocido,
  // usamos el POM; si no, fallback al selector genérico. Esto es a la vez
  // ejemplo de "cómo reusar el POM" y "cómo extender el patrón" para otros
  // formularios.
  const loginPage = new LoginPage(page);
  if (label === 'Usuario') {
    await loginPage.emailInput.fill(value);
    return;
  }
  if (label === 'contraseña') {
    await loginPage.passwordInput.fill(value);
    return;
  }
  await page.getByLabel(label).fill(value);
});

When('hago clic en {string}', async ({ page }, name: string) => {
  const loginPage = new LoginPage(page);
  if (name === 'Iniciar Sesión') {
    await loginPage.submitButton.click();
    return;
  }
  await page.getByRole('button', { name }).click();
});

// ---- Aserciones de UI -----------------------------------------------------

Then('debería ver el campo {string}', async ({ page }, label: string) => {
  await expect(page.getByLabel(label)).toBeVisible();
});

Then('debería ver el botón {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name })).toBeVisible();
});

Then('debería estar autenticado', async ({ page }) => {
  await expect(page).toHaveURL(/\/app(\/|$)/, { timeout: 15_000 });
  await expect(page.locator('.sidebar-nav, app-sidebar, nav.navbar').first()).toBeVisible({
    timeout: 10_000,
  });
});

Then('la URL debería ser {string}', async ({ page }, url: string) => {
  await expect(page).toHaveURL(url);
});

Then('la URL debería contener {string}', async ({ page }, partial: string) => {
  // Escapa regex chars para que "/" y "." se interpreten como literales.
  const escaped = partial.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(page).toHaveURL(new RegExp(escaped));
});

Then('debería ver un mensaje de error de autenticación', async ({ page }) => {
  await expect(page.locator('.alert-danger')).toBeVisible({ timeout: 15_000 });
});