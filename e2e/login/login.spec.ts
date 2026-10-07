import { test, expect } from '@playwright/test';
import { LoginPage } from '../base-page';
import { ADMIN_USER, ROUTES, expectAuthenticated } from '../helpers';

test.describe('Login', () => {
  test(
    'Muestra la pantalla de login y sus campos',
    { tag: ['@critical', '@login', '@LOGIN-E2E-001'] },
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto(ROUTES.login);

      // Usa los locators del LoginPage (id-based) para evitar el strict mode
      // con el botón "Ver contraseña" cuyo aria-label contiene "contraseña".
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    },
  );

  test(
    'Login exitoso con admin redirige al dashboard',
    { tag: ['@critical', '@login', '@LOGIN-E2E-002'] },
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto(ROUTES.login);
      await loginPage.login(ADMIN_USER.email, ADMIN_USER.password);

      await expectAuthenticated(page);
      await expect(page).toHaveURL(ROUTES.dashboard);
    },
  );

  test(
    'Login con credenciales inválidas muestra error y no redirige',
    { tag: ['@critical', '@login', '@LOGIN-E2E-003'] },
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto(ROUTES.login);
      await loginPage.login('admin@jasrapo.com', 'ContraseñaIncorrecta123');

      await expect(page.locator('.alert-danger')).toBeVisible({ timeout: 15000 });
      await expect(page).toHaveURL(/\/login/);
    },
  );
});
