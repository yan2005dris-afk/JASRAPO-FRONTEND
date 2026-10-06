import { test, expect, Page } from '@playwright/test';
import { LoginPage, ClientesListPage, ClienteFormPage, ClienteFormData } from '../base-page';
import { ADMIN_USER, randomCedulaEcuatoriana, ROUTES } from '../helpers';

/**
 * ════════════════════════════════════════════════════════════════════════
 *  TEST: Registrar cliente (happy path refactorizado desde Codegen)
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Este spec es la versión **refactorizada con Page Objects** del test
 *  crudo que generó Playwright Codegen. Comparando ambos vas a ver:
 *
 *    Crudo (de Codegen):
 *      - 30+ selectores únicos en línea
 *      - Decenas de `.click()` + `.press('CapsLock')` + `.fill()` redundantes
 *      - Sin aserciones
 *      - Datos hardcoded
 *
 *    Refactor (este archivo):
 *      - 0 selectores en el test, todos viven en POMs reusables
 *      - Una sola llamada por acción (`form.fillAndSubmit(...)`)
 *      - Aserciones al final
 *      - Cédula aleatoria
 *      - Waits entre acciones para headed mode (capacitación)
 *
 *  ═══════════════════════════════════════════════════════════════════════
 *
 *  MODOS DE EJECUCIÓN:
 *
 *  1) STANDALONE (mockea backend con `page.route`):
 *       pnpm e2e:standalone             # headless
 *       pnpm e2e:standalone:headed      # browser visible, demo para capacitación
 *
 *     Limitaciones: el flujo de clientes requiere más endpoints internos
 *     que los que mockeamos acá (al cargar el dashboard, el frontend hace
 *     varios GETs que no estamos interceptando). Por eso el happy path
 *     está marcado como `test.skip()` en modo standalone — ver el sanity
 *     test de abajo que SÍ corre.
 *
 *  2) CON BACKEND REAL (recomendado para E2E verdadero):
 *       docker compose up backend postgres redis
 *       pnpm e2e --grep "CLIENTES-E2E-001"
 *
 *     Para ejecutarlo, comentá la línea `test.skip(...)` de abajo.
 *
 *  ═══════════════════════════════════════════════════════════════════════
 */

async function mockBackend(page: Page): Promise<void> {
  // Mock de login (browser-side).
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock.access.token',
        sid: 'mock-sid',
        sub: 'mock-user-id',
        email: 'admin@jasrapo.com',
        nombre: 'Admin Mock',
        rolId: 1,
        nombreRol: 'Administrador',
        accessTokenInfo: {
          iatDate: new Date().toISOString(),
          expDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
      }),
    });
  });

  // Mock del menú del sidebar.
  // Endpoint real: /api/v1/menus/my (ver src/app/core/services/menu.service.ts).
  await page.route('**/api/v1/menus/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Contratos',
          route: '/Contratos',
          parent_menu_id: null,
          menu_order: 1,
          is_active: true,
          children: [
            {
              id: 2,
              name: 'Clientes',
              route: '/Contratos/Cliente',
              parent_menu_id: 1,
              menu_order: 1,
              is_active: true,
            },
          ],
        },
      ]),
    });
  });

  // Mock de POST /api/v1/clientes (alta de cliente).
  await page.route('**/api/v1/clientes**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = (route.request().postDataJSON() ?? {}) as Partial<ClienteFormData>;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: Math.floor(Math.random() * 10000),
          identificacion: body.identificacion ?? '',
          nombres: body.nombres ?? '',
          apellidos: body.apellidos ?? '',
          correo: body.correo ?? '',
          telefono: body.telefono ?? '',
          direccion: body.direccion ?? '',
        }),
      });
      return;
    }
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, pageSize: 10 }),
      });
      return;
    }
    await route.continue();
  });
}

/** Pausa opcional para headed mode. Inofensiva en headless. */
async function demoPause(page: Page, headedMode: boolean, ms = 600): Promise<void> {
  if (headedMode) {
    await page.waitForTimeout(ms);
  }
}

const isHeaded = () => process.argv.includes('--headed') || process.env.PWTEST_HEADED === '1';

test.describe('Registrar cliente', () => {
  test(
    'happy path: registrar cliente con cédula nueva lo deja en el detalle',
    { tag: ['@clientes', '@critical', '@CLIENTES-E2E-001'] },
    async ({ page }) => {
      // ⚠️ Por defecto skip en modo standalone: el frontend tiene dependencias
      // internas que requieren backend real. Para correr:
      //   - Opción A: `docker compose up backend postgres redis` + comentar skip
      //   - Opción B: agregar todos los mocks de endpoints internos necesarios
      test.skip(
        process.env.SKIP_CLIENNTES_HAPPY_PATH !== 'no',
        'Happy path requiere backend real (ver comentario al inicio del spec). ' +
          'Para correr: docker compose up backend && pnpm e2e --grep CLIENTES-E2E-001',
      );

      await mockBackend(page);
      const headed = isHeaded();

      // ── Step 1: Login ──────────────────────────────────────────────
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(ADMIN_USER.email, ADMIN_USER.password);
      await expect(page).toHaveURL(/\/app\/dashboard/);
      await demoPause(page, headed, 1200);

      // ── Step 2: Ir al listado ──────────────────────────────────────
      await page.goto(ROUTES.clientesList);
      const clientes = new ClientesListPage(page);
      await expect(clientes.addButton).toBeVisible({ timeout: 15_000 });
      await demoPause(page, headed, 1000);

      // ── Step 3: Abrir el formulario de alta ───────────────────────
      await clientes.openNewClientForm();
      await demoPause(page, headed, 1000);

      // ── Step 4: Completar el formulario paso a paso ────────────────
      const form = new ClienteFormPage(page);
      const data: ClienteFormData = {
        identificacion: randomCedulaEcuatoriana(),
        nombres: 'Yandris',
        apellidos: 'Rivera',
        direccion: 'Santa Elena',
        correo: 'yan2005dris@gmail.com',
        telefono: '0960513008',
      };

      await form.tipoIdentificacion.selectOption('2');
      await demoPause(page, headed, 500);
      await form.numeroIdentificacion.fill(data.identificacion);
      await demoPause(page, headed, 500);
      await form.nombres.fill(data.nombres);
      await demoPause(page, headed, 500);
      await form.apellidos.fill(data.apellidos);
      await demoPause(page, headed, 500);
      await form.direccion.fill(data.direccion);
      await demoPause(page, headed, 500);
      await form.correo.fill(data.correo);
      await demoPause(page, headed, 500);
      await form.telefonoPrincipal.fill(data.telefono);
      await demoPause(page, headed, 800);

      // ── Step 5: Submit ─────────────────────────────────────────────
      await form.submitButton.click();
      await page.waitForTimeout(headed ? 2000 : 1000);

      // ── Assert ─────────────────────────────────────────────────────
      await expect(page).toHaveURL(/\/Contratos\/Cliente\/\d+\/edit/);
      await expect(page.getByText('Yandris').first()).toBeVisible();
    },
  );

  test(
    'sanity: el patrón POM + mock mínimo corre standalone',
    { tag: ['@clientes', '@smoke'] },
    async ({ page }) => {
      await mockBackend(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(ADMIN_USER.email, ADMIN_USER.password);
      await expect(page).toHaveURL(/\/app\/dashboard/);
    },
  );
});
