/**
 * gen-api.ts — Pipeline de generación del cliente Angular desde /docs-json.
 *
 * Pipeline:
 *   1. fetch http://localhost:3000/docs-json → .openapi/raw.json
 *   2. filtrar spec por tags (auth, Rubros, contracts) → .openapi/filtered.json
 *   3. invocar orval → src/app/generated/api/*.ts
 *
 * Tags permitidos (DEBEN coincidir con los `@ApiTags` reales del backend):
 *   - 'auth'      → auth.controller.ts (POST /api/v1/auth/login)
 *   - 'Rubros'    → rubros.controller.ts (GET  /api/v1/rubros)
 *   - 'contracts' → contrato-medidor.controller.ts (GET /api/v1/contracts)
 *
 * Logging: errores a stderr, éxito silencioso.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const BACKEND_DOCS_URL = 'http://localhost:3000/docs-json';
const RAW_PATH = resolve(process.cwd(), '.openapi/raw.json');
const FILTERED_PATH = resolve(process.cwd(), '.openapi/filtered.json');

/** Tags Swagger que se conservan en el cliente generado (first-slice). */
const ALLOWED_TAGS = new Set(['auth', 'Rubros', 'contracts']);

function die(msg: string): never {
  console.error(`[gen-api] ${msg}`);
  process.exit(1);
}

async function fetchSpec(): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(BACKEND_DOCS_URL);
  } catch (err) {
    die(`fetch failed — backend not reachable at ${BACKEND_DOCS_URL}. ¿Está Up? (${(err as Error).message})`);
  }
  if (!res.ok) {
    die(`fetch failed — HTTP ${res.status} ${res.statusText} from ${BACKEND_DOCS_URL}`);
  }
  return res.json();
}

interface OpenApiOperation { tags?: string[] }
type OpenApiPathItem = Record<string, OpenApiOperation | undefined>;
interface OpenApiSpec {
  paths?: Record<string, OpenApiPathItem>;
  tags?: { name: string; description?: string }[];
}

function filterSpec(raw: unknown): OpenApiSpec {
  const spec = raw as OpenApiSpec;

  // 1. Filtrar paths: conservar si AL MENOS una operation tiene tag en ALLOWED_TAGS
  const filteredPaths: Record<string, OpenApiPathItem> = {};
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    if (!item || typeof item !== 'object') continue;
    const ops = Object.values(item) as (OpenApiOperation | undefined)[];
    const hit = ops.some(
      (op) => Array.isArray(op?.tags) && op!.tags.some((t) => ALLOWED_TAGS.has(t)),
    );
    if (hit) filteredPaths[path] = item;
  }

  // 2. Filtrar tags[]: conservar solo los del set permitido
  const filteredTags = (spec.tags ?? []).filter((t) => ALLOWED_TAGS.has(t.name));

  return { ...spec, paths: filteredPaths, tags: filteredTags };
}

async function main(): Promise<void> {
  // Paso 1: fetch + raw.json
  const raw = await fetchSpec();
  await mkdir(dirname(RAW_PATH), { recursive: true });
  await writeFile(RAW_PATH, JSON.stringify(raw, null, 2), 'utf8');

  // Paso 2: filter → filtered.json
  const filtered = filterSpec(raw);
  await mkdir(dirname(FILTERED_PATH), { recursive: true });
  await writeFile(FILTERED_PATH, JSON.stringify(filtered, null, 2), 'utf8');

  // Paso 3: invocar orval
  // orval 7.x expone `generate` desde el entry point; la API programática exacta
  // puede variar entre versiones. Usamos el CLI via subprocess para máxima
  // compatibilidad (orval resuelve `orval.config.ts` desde cwd por su CLI).
  const { spawnSync } = await import('node:child_process');
  const res = spawnSync('npx', ['orval', '--config', 'orval.config.ts'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  if (res.status !== 0) {
    die(`orval CLI exited with status ${res.status}`);
  }
}

main().catch((err) => die(err instanceof Error ? err.message : String(err)));