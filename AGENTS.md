# Artificial Intelligence Operational Guidelines

This file is the single source of truth for AI agents operating in this repository. Read and follow these rules strictly.

## Non-negotiables

- `pnpm` is the ONLY allowed package manager. Do not use npm or yarn.
- The `src/app/generated/` directory is gitignored. You MUST run `pnpm gen:api` before compiling the project.
- NEVER hand-edit Orval output in `src/app/generated/`.
- NEVER run `gentle-ai install --scope workspace` in this repository (the global config covers it, and workspace scope collides with these root files).

## Local language matrix

This document is written in English because models read English rules more reliably. However, this repository follows a strict language matrix that CANNOT be inferred from the code alone. You MUST adhere to this table:

| Artifact type | Required language | Example |
|---|---|---|
| Code identifiers / logic / comments | English | `interface User`, `getUserById()` |
| DTO and API contract field names | Spanish | `nombre_completo`, `id_usuario` |
| UI copy | Spanish | `Guardar Cambios`, `Confirmar` |

## Code-forced conventions

Understand the difference between what the compiler forces and what the team has chosen.

**Forced by the compiler and framework:**
- **Strict TypeScript**: The compiler enforces `strict: true`, `strictTemplates: true`, and `noPropertyAccessFromIndexSignature: true`.
- **Standalone Components**: The project uses standalone components because there are zero `NgModule` references in production code.

**Project conventions chosen by the team:**
- `inject()` over constructor injection (398 vs 0 occurrences).
- Native control flow (824 `@if` vs 0 `*ngIf`).
- `input()` over `@Input` (52 vs 0 occurrences).
- `OnPush` change detection (119 of 132 components).
- Lazy loading via `loadComponent` (77 occurrences vs 0 `loadChildren`).

## The `standalone` rule

Omit the `standalone` key from `@Component`; never write `standalone: false` (as the project has zero NgModules).

Do not opportunistically clean up legacy `standalone: true` occurrences inside unrelated changes. The migration is in progress.

## Test-quality traps

**Warning:** A green test suite is not an excuse to skip tests. New features need real tests.

The current test suite has quality traps:
- 22 of 94 spec files hold a single tautological test (7 of them literally named "should be created").
- `kpi-card.component.spec.ts` asserts `expect(validTones).toHaveLength(6)` against an array that the same spec file defines.
- The `consulta-planilla`, `users`, and `profile` features have zero tests.
- The `distribution` and `water-sources` features have zero source files.

## CI command chain

The CI pipeline (`.github/workflows/lint-format.yml`) executes the following exact chain. Ensure your changes pass these locally:
1. **Lint and Build:**
   - `pnpm install --frozen-lockfile`
   - `pnpm run format:check`
   - `pnpm run lint`
   - `pnpm run build`
   - `pnpm test`
2. **Dependency Audit (high+):**
   - `pnpm install --frozen-lockfile --ignore-scripts`
   - `pnpm audit --prod --audit-level=high`
3. **Docker Build & Smoke Test:**
   - Builds the `production` target.
   - Runs the container: `docker run -d --name test-frontend -p 8080:80 jasrapo-frontend:test`
   - Smoke test: `curl -f http://localhost:8080/ || exit 1`

**E2E Testing Constraint:**
E2E testing requires a real backend running at `127.0.0.1:3000` (proxied from the Angular dev server on port 4200) and is subject to a strict backend login rate limit (5 req/min).

## Commit conventions

- Use Conventional Commits.
- Do NOT add AI attribution or `Co-Authored-By` trailers.
