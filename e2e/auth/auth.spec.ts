import { test, expect } from '@playwright/test';

/**
 * Tests that rely on the persisted authenticated session (storageState).
 * Runs in the chromium-authed project; no login here.
 *
 * NOTE: the logout test lives at the END of e2e/billing/billing.spec.ts because
 * it revokes the shared session on the backend; it must run after every test
 * that uses the persisted session.
 */
test.describe('Sesión autenticada (storageState)', () => {
  test('Abre el dashboard sin volver a loguearse',
    { tag: ['@high', '@auth', '@AUTH-E2E-003'] },
    async ({ page }) => {
      await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15000 });
      await expect(page.locator('header, app-header, .navbar').first()).toBeVisible();
    });
});