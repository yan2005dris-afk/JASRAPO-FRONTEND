import { defineConfig, devices } from '@playwright/test';

/**
 * E2E test configuration for the Jasrapo frontend.
 * The Angular dev server (ng serve, port 4200) proxies /api -> backend :3000.
 *
 * Projects:
 *  - chromium-authed: bulk of the suite, reuses a session captured in
 *    global-setup (avoids the backend 5 req/min login rate limit).
 *  - chromium-clean: tests that must start unauthenticated (login screen,
 *    auth guard, public inquiry).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-authed',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      testMatch: /e2e\/(billing|auth)\/.*\.spec\.ts/,
    },
    {
      name: 'chromium-clean',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /e2e\/(login|public)\/.*\.spec\.ts/,
    },
  ],
});