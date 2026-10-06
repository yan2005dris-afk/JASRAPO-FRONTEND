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

const { Given, When, Then } = createBdd();

// ---- Mock del backend -----------------------------------------------------
//
// Pedagogía: este `Given` muestra a los muchachos cómo desacoplar los tests
// E2E del backend cuando todavía no hay uno estable, sin perder el flujo
// Given / When / Then del feature. Las respuestas hardcoded replican el
// payload real del endpoint `auth.login` del seed.
//
// Si el equipo prefiere usar el backend real, basta con:
//   1) Quitar este `Given` de los escenarios que lo usan.
//   2) Levantar `docker compose up backend postgres redis`.
//   3) `pnpm e2e:bdd` correrá contra el backend real.
Given('que el backend mockea el endpoint de autenticación', async ({ page }) => {
  // El frontend dev usa `/api` proxyeado al backend. Matcheamos también
  // `/auth/login` por si la config cambia, y registramos primero el handler
  // específico (admin válido) y luego el catch-all para 401.
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { email?: string; password?: string };
    if (body?.email === 'admin@jasrapo.com' && body?.password === 'Admin123#') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock.access.token',
          sid: 'mock-sid',
          sub: 'mock-user-id',
          email: body.email,
          nombre: 'Admin Mock',
          rolId: 1,
          nombreRol: 'Administrador',
          accessTokenInfo: {
            iatDate: new Date().toISOString(),
            expDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Credenciales inválidas' }),
    });
  });
});

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
  if (name === 'Ingresar al Sistema') {
    await loginPage.submitButton.click();
    return;
  }
  await page.getByRole('button', { name }).click();
});

// ---- Aserciones de UI -----------------------------------------------------

Then('debería ver el campo {string}', async ({ page }, label: string) => {
  // Para labels conocidos del login usamos los locators del POM, evitando el
  // strict mode del toggle "Ver contraseña". Otros labels van por getByLabel.
  const loginPage = new LoginPage(page);
  if (label === 'Usuario') {
    await expect(loginPage.emailInput).toBeVisible();
    return;
  }
  if (label === 'contraseña') {
    await expect(loginPage.passwordInput).toBeVisible();
    return;
  }
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