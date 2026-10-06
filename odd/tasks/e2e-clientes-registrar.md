# Feature: e2e-clientes-registrar

Rama: `feat/e2e-clientes-registrar` (base: `develop`)

## Objetivo

Implementar el flujo E2E **"Registrar cliente"** partiendo del test crudo
generado por Playwright Codegen y refactorizarlo con Page Objects. El test
debe correr **standalone** (sin backend real, con `page.route()` mockeando
auth + menu + POST cliente) y debe incluir **waits explícitos entre pasos**
para usarse como demo visual en modo `--headed` durante la capacitación.

## Decisiones técnicas

| Tema               | Decisión                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Page Objects       | `ClientesListPage` + `ClienteFormPage` en `e2e/base-page.ts` (junto a `LoginPage` ya existente)     |
| Mocking            | `page.route()` para `auth/login`, `menu`, `clientes` POST. Standalone, sin docker compose.         |
| Waits para headed  | `await page.waitForTimeout(500–800ms)` entre acciones principales. Comentados y removibles para CI. |
| Datos del cliente  | Cédula aleatoria (`randomCedulaEcuatoriana()` en helpers) para no chocar en re-runs.                  |
| Suite              | Test nativo (no BDD) — el PR #178 ya cubre BDD con login. Este PR demuestra POMs + Codegen refactor.  |

## Tasks

| # | Task | Commit esperado |
| --- | --- | --- |
| T1 | Extender `e2e/base-page.ts` con `ClientesListPage` + `ClienteFormPage` | `refactor(e2e): add ClientesListPage and ClienteFormPage POMs` |
| T2 | Agregar `randomCedulaEcuatoriana()` a `e2e/helpers.ts` | `test(e2e): add randomCedulaEcuatoriana helper for unique IDs` |
| T3 | Crear `e2e/clientes/registrar-cliente.spec.ts` con waits para headed | `test(e2e): add registrar-cliente happy-path test with headed timing` |
| T4 | Verificación headless + headed + commit + push + PR | `chore(e2e): verify registrar-cliente runs headless and headed` |

## Acceptance criteria

- [x] Rama creada limpia desde `develop`
- [ ] `pnpm e2e --grep "registrar cliente"` corre headless y pasa
- [ ] `pnpm e2e:headed --grep "registrar cliente"` abre el browser y se ven los pasos uno a uno
- [ ] El spec usa los POMs (sin selectores crudos en el test)
- [ ] Cédula aleatoria (no hardcoded)
- [ ] Los waits están comentados explicando que son solo para headed

## Non-goals

- No migrar a BDD (el PR #178 ya cubre eso)
- No agregar escenarios negativos (cliente duplicado, validación, etc.) — eso es follow-up
- No tocar el frontend `src/**`