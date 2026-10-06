import { defineConfig, devices } from '@playwright/test';

/**
 * Standalone Playwright config — **sin `globalSetup`** ni `chromium-authed`.
 *
 * Pensado para tests E2E que mockean el backend completo con `page.route()`
 * y corren standalone (sin docker compose del backend levantado).
 *
 * Por qué un config separado:
 *   El config nativo (`playwright.config.ts`) tiene `globalSetup` que hace
 *   un POST real contra `/api/v1/auth/login` para capturar la sesión
 *   autenticada. Eso requiere el backend corriendo. Los specs que mockean
 *   auth desde el cliente (browser-side) no necesitan ese setup y se
 *   ahorran el rate-limit retry.
 *
 * Run con:
 *   pnpm e2e:standalone             # headless
 *   pnpm e2e:standalone:headed      # browser visible, demo para capacitación
 *   pnpm e2e:standalone:ui          # UI mode
 */
export default defineConfig({
  testDir: './e2e/clientes',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-standalone', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-standalone',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
