import { Page, expect } from '@playwright/test';

/** Seed credentials for the Jasrapo system (see backend prisma/schema/seeds/user.seed.ts). */
export const ADMIN_USER = {
  email: 'admin@jasrapo.com',
  password: 'Admin123#',
};

export const SECRETARIA_USER = {
  email: 'secretaria@jasrapo.com',
  password: 'Secretaria123#',
};

/** Root of the authenticated app area. */
export const APP_ROOT = '/app';

/** Routes used across specs. */
export const ROUTES = {
  login: '/login',
  dashboard: '/app/dashboard',
  batches: '/app/Facturacion/EnvioDeFacturacion',
  prefacturas: '/app/Facturacion/GeneracionPlanilla',
  billInquiry: '/consulta-planilla',
  profile: '/app/profile',
  clientesList: '/app/Contratos/Cliente',
  clienteNew: '/app/Contratos/Cliente/new',
  clienteEdit: (id: string | number) => `/app/Contratos/Cliente/${id}/edit`,
};

/** Fill the login form and submit. Assumes we are on /login. */
export async function login(page: Page, email = ADMIN_USER.email, password = ADMIN_USER.password) {
  await page.getByLabel('Usuario').fill(email);
  await page.getByLabel('contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
}

/** Wait for the app shell after login: URL under /app and sidebar visible. */
export async function expectAuthenticated(page: Page) {
  await expect(page).toHaveURL(/\/app(\/|$)/, { timeout: 15000 });
  await expect(page.locator('.sidebar-nav, app-sidebar, nav.navbar').first()).toBeVisible({
    timeout: 10000,
  });
}

/** Navigate straight to a route using the SPA router; waits for network to settle. */
export async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

/** Generic toast assertion used by most actions. */
export async function expectToast(page: Page, text: string, timeout = 10000) {
  await expect(page.locator('.toast, [role="status"], .toast-container')).toContainText(text, {
    timeout,
  });
}

/**
 * Genera una cédula ecuatoriana única (10 dígitos, empieza con 09).
 * Sirve para que un test de "alta de cliente" no choque duplique los datos
 * cuando se corre múltiples veces contra la misma DB o mock.
 *
 * Ejemplo: `09` + últimos 8 dígitos del timestamp → 10 dígitos únicos por ms.
 */
export function randomCedulaEcuatoriana(): string {
  return `09${Date.now().toString().slice(-8)}`;
}
