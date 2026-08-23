import { defineConfig } from 'orval';

/**
 * orval.config.ts — Genera cliente Angular desde la spec OpenAPI del backend.
 *
 * Input esperado: `.openapi/filtered.json` (generado por `pnpm gen:api`,
 * que fetchea /docs-json y filtra por tags).
 *
 * Output: `src/app/generated/api/` con un barrel `frontend.ts` y un archivo
 * por tag (mode: 'tags-split'). Tree-shaking granular: importar solo desde
 * `./generated/api/<tag>` evita bundle bloat.
 *
 * Para regenerar: `pnpm gen:api`. Para probar end-to-end: `pnpm gen:api:smoke`.
 */
export default defineConfig({
  frontend: {
    input: './.openapi/filtered.json',
    output: {
      target: 'src/app/generated/api/frontend.ts',
      client: 'angular',
      mode: 'tags-split',
      override: {
        useDeprecatedOperations: false,
      },
    },
  },
});