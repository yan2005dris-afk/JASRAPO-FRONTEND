import { request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Global setup: performs ONE API login against the real backend and persists
 * the full session (refresh cookie + localStorage) as storageState for the
 * authenticated project.
 *
 * The auth endpoint is rate-limited (5 req/min), so we retry with backoff and
 * the bulk of the suite reuses this single session instead of logging in per
 * test.
 */
const STORAGE_STATE = 'e2e/.auth/user.json';

async function loginWithRetry(
  apiBase: string,
  email: string,
  password: string,
): Promise<{ body: Record<string, unknown>; refreshToken?: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const ctx = await request.newContext({
      baseURL: apiBase,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
    const res = await ctx.post('/api/v1/auth/login', { data: { email, password } });

    if (res.ok()) {
      const body = (await res.json()) as Record<string, unknown>;
      const setCookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie');
      const refreshToken = setCookies
        .map((h) => h.value)
        .find((c) => c.startsWith('refreshToken='))
        ?.split(';')[0]
        .replace('refreshToken=', '');
      await ctx.dispose();
      return { body, refreshToken };
    }

    lastError = `login failed (${res.status()}): ${await res.text()}`;
    await ctx.dispose();

    // 429 = rate limit; back off and retry. Other errors: wait briefly too.
    const backoffMs = attempt * 15000;
    console.warn(`[globalSetup] attempt ${attempt} ${lastError}; retrying in ${backoffMs / 1000}s`);
    await new Promise((r) => setTimeout(r, backoffMs));
  }
  throw new Error(`[globalSetup] could not log in after retries: ${String(lastError)}`);
}

export default async function globalSetup(): Promise<void> {
  const apiBase = process.env.API_URL || 'http://localhost:3000';
  const email = process.env.TEST_ADMIN_EMAIL || 'admin@jasrapo.com';
  const password = process.env.TEST_ADMIN_PASSWORD || 'Admin123#';

  const { body, refreshToken } = await loginWithRetry(apiBase, email, password);

  const accessToken = body.accessToken as string;
  const sid = String(body.sid);
  const accessTokenInfo = (body.accessTokenInfo ?? {}) as Record<string, unknown>;
  const createdAt = (accessTokenInfo.iatDate as string) || new Date().toISOString();
  const expiresAt =
    (accessTokenInfo.expDate as string) || new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const user = {
    id: String(body.sub),
    email: body.email || '',
    name: body.nombre || 'Usuario',
    roleId: body.rolId,
    roleName: body.nombreRol || 'Usuario',
    avatar: body.avatar ?? null,
  };

  const cookies = [];
  if (refreshToken) {
    cookies.push({
      name: 'refreshToken',
      value: refreshToken,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    });
  }

  const storageState = {
    cookies,
    origins: [
      {
        origin: 'http://localhost:4200',
        localStorage: [
          { name: 'token', value: accessToken },
          { name: 'sid', value: sid },
          { name: 'tokenCreatedAt', value: createdAt },
          { name: 'tokenExpiresAt', value: expiresAt },
          { name: 'user', value: JSON.stringify(user) },
        ],
      },
    ],
  };

  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(STORAGE_STATE, JSON.stringify(storageState, null, 2));
}

export {};
