import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * BDD (Cucumber/Gherkin) configuration — runs **alongside** the native
 * Playwright config in `playwright.config.ts` without touching it.
 *
 * Why a separate file?
 *   The native config wires `chromium-authed` and `chromium-clean` projects
 *   plus a `globalSetup` that performs a single API login to dodge the
 *   backend's 5 req/min rate limit. BDD scenarios for the login screen must
 *   start **without** that cached session, so we keep this runner isolated.
 *
 * What this does:
 *   1. Reads `*.feature` files under `e2e/login/`.
 *   2. Matches their steps against `*.steps.ts` in the same folder.
 *   3. Generates Playwright specs in `.features-gen/` and runs them.
 *
 * Scripts:
 *   pnpm e2e:bdd:gen   # only generate the .features-gen/ specs
 *   pnpm e2e:bdd       # generate + execute the suite
 */
const testDir = defineBddConfig({
  features: 'e2e/login/*.feature',
  steps: ['e2e/login/*.steps.ts', 'e2e/login/*.steps.js'],
  language: 'es',
  outputDir: '.features-gen',
});

export default defineConfig({
  testDir,
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-bdd', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-bdd',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});