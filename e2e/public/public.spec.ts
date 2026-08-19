import { test, expect } from '@playwright/test';
import { ROUTES } from '../helpers';

test.describe('Acceso público — Consulta de planilla', () => {
  test('La consulta pública carga sin autenticación',
    { tag: ['@high', '@public', '@PUBLIC-E2E-001'] },
    async ({ page }) => {
      await page.goto(ROUTES.billInquiry, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/consulta-planilla/);
      // La página debe mostrar un formulario de consulta (cédula/RUC o similar)
      await expect(page.locator('form, input').first()).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Guard de autenticación', () => {
  test('Redirige a /login cuando se intenta acceder a /app sin sesión',
    { tag: ['@critical', '@auth', '@AUTH-E2E-001'] },
    async ({ page }) => {
      // Limpiar storage para garantizar sesión ausente
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.clear());
      await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });

      // authGuard debe redirigir al login
      await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    });
});

test.describe('Sesión — Logout', () => {
  test('Logout desde el header vuelve al login',
    { tag: ['@high', '@auth', '@AUTH-E2E-002'] },
    async ({ page }) => {
      // Usa su propia sesión para no revocar el storageState compartido.
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Usuario').fill('admin@jasrapo.com');
      await page.getByLabel('contraseña').fill('Admin123#');
      await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
      await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15000 });

      // Abrir dropdown de usuario en el header y cerrar sesión
      await page.locator('header .dropdown').first().getByRole('button').click();
      await page.getByRole('button', { name: /Cerrar Sesión/i }).click();

      await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    });
});