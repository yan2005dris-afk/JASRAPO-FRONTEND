/**
 * gen-api-smoke.ts — Smoke test del cliente generado contra el backend local.
 *
 * Ejecuta 3 llamadas usando `fetch` (no el cliente generado, porque queremos
 * validar el END-TO-END sin acoplarnos a detalles de tipos de orval en runtime):
 *
 *   1. POST /api/v1/auth/login   (seed admin)        → accessToken
 *   2. GET  /api/v1/rubros       (Bearer admin)      → 200
 *   3. GET  /api/v1/contracts    (Bearer admin)      → 200
 *
 * Exit 0 si los 3 devuelven 200; exit 1 + stderr en cualquier fallo.
 * Requiere: backend Up en :3000 + DB con seed (`pnpm --filter backend seed`).
 *
 * Si el cliente generado de orval está disponible en `src/app/generated/api/`,
 * el smoke también valida que los métodos tipados existen (import dinámico con
 * try/catch — falla suave si el cliente aún no fue generado).
 */

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@jasrapo.com';
const ADMIN_PASSWORD = 'Admin123#';

function die(msg: string): never {
  console.error(`[gen-api-smoke] ${msg}`);
  process.exit(1);
}

async function check(label: string, res: Response): Promise<void> {
  if (!res.ok) die(`${label} → HTTP ${res.status} ${res.statusText}`);
  // success silencioso por defecto (ver [DESIGN-DEVIATION-DEFAULT-ACCEPTED D3])
}

async function main(): Promise<void> {
  // 1. Login
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  await check('POST /api/v1/auth/login', loginRes);

  const loginBody = (await loginRes.json()) as { accessToken?: string; token?: string };
  const accessToken = loginBody.accessToken ?? loginBody.token;
  if (!accessToken) die('auth/login response did not include accessToken');

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 2. Rubros (billing)
  const rubrosRes = await fetch(`${BASE_URL}/api/v1/rubros`, { headers: authHeaders });
  await check('GET /api/v1/rubros', rubrosRes);

  // 3. Contracts
  const contractsRes = await fetch(`${BASE_URL}/api/v1/contracts`, { headers: authHeaders });
  await check('GET /api/v1/contracts', contractsRes);

  // 4. (Opcional, no-bloqueante) Validar que el cliente generado existe
  try {
    await import('../src/app/generated/api/frontend.js').then((m) => {
      const exports = Object.keys(m);
      if (exports.length === 0) {
        console.error(
          '[gen-api-smoke] WARN: cliente generado existe pero no exporta nada (¿se regeneró?)',
        );
      }
    });
  } catch {
    console.error(
      '[gen-api-smoke] WARN: cliente generado no encontrado en src/app/generated/api/. ' +
        'Corré `pnpm gen:api` primero.',
    );
  }
}

main().catch((err) => die(err instanceof Error ? err.message : String(err)));