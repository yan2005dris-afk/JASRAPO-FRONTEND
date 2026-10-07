# Feature: e2e-cucumber-capacitacion

Rama: `feat/e2e-cucumber-capacitacion` (base: `develop`)

## Objetivo

Agregar soporte de **Cucumber (Gherkin)** sobre el setup existente de Playwright en `JASRAPO-FRONTEND` para capacitar a los muchachos en:

1. Cómo escribir features (`.feature`) en Gherkin.
3. Cómo escribir los **step definitions** (el "código" que ejecuta cada paso).
4. Cómo usar **Playwright Codegen** para grabar interacciones y acelerar la escritura de steps.

El ejemplo es la pantalla de **Login** (`/login`) porque ya tiene specs Playwright maduros (`e2e/login/login.spec.ts`) que sirven como referencia 1:1.

## Decisiones técnicas

| Tema | Decisión | Razón |
| --- | --- | --- |
| Librería BDD | `playwright-bdd@^9.2.0` | Combina Gherkin con el runner de Playwright nativo; soporta Playwright 1.62; permite reusar fixtures, traces, videos y reports ya configurados. |
| Configuración | **`playwright.bdd.config.ts` paralelo** (no tocar `playwright.config.ts`) | Cero riesgo de romper los proyectos `chromium-authed` / `chromium-clean` existentes. `pnpm e2e` sigue corriendo lo de siempre. |
| Idioma de features | Español | Consistente con `e2e/login/login.spec.ts` y `e2e/login/login.md`. |
| Idioma de steps | TypeScript con identificadores en inglés; cadenas Gherkin en español | Estándar de la industria, separa "qué dice el negocio" del "cómo se programa". |
| Page objects | `LoginPage` de `e2e/base-page.ts` | Reuso total. Los steps delegan en el POM ya existente. |
| Tags | `@login`, `@critical`, casos `LOGIN-E2E-00X` | Mapeo 1:1 con los specs actuales para que QA pueda correlacionar. |
| Reportes | HTML Cucumber + HTML Playwright | `playwright-bdd` los emite por defecto. |
| Scripts nuevos | `e2e:bdd`, `e2e:bdd:gen`, `e2e:codegen` | Aislados para no chocar con `e2e` / `e2e:ui` / `e2e:headed`. |

## Tasks

| # | Task | Commit esperado |
| --- | --- | --- |
| T1 | Agregar dep `playwright-bdd@^9.2.0` y scripts npm | `chore(e2e): add playwright-bdd for BDD/Gherkin examples` |
| T2 | Crear `playwright.bdd.config.ts` paralelo + `.gitignore` para `.features-gen/` | `chore(e2e): add parallel playwright.bdd.config for BDD` |
| T3 | Escribir `e2e/login/login.feature` con 3 escenarios Gherkin | `test(e2e): add login.feature with Gherkin scenarios` |
| T4 | Implementar `e2e/login/login.steps.ts` con steps reusando `LoginPage` | `test(e2e): add login.steps.ts reusing LoginPage POM` |
| T5 | Generar `bddgen` y verificar GREEN corriendo `pnpm e2e:bdd` | `test(e2e): verify BDD login scenarios pass` |
| T6 | Documentación `e2e/capacitacion/README.md` (cómo escribir features + steps) | `docs(e2e): add capacitacion README for BDD authoring` |
| T7 | Tutorial `e2e/capacitacion/codegen-ejemplo.md` (cómo usar playwright codegen) | `docs(e2e): add codegen tutorial for BDD step authoring` |
| T8 | Verificación final: `pnpm e2e` (Playwright nativo) + `pnpm e2e:bdd` siguen verdes | `chore(e2e): final verification — native and BDD both green` |

## Acceptance criteria

- [x] Rama `feat/e2e-cucumber-capacitacion` creada limpia desde `develop`.
- [ ] `pnpm e2e:bdd` ejecuta los 3 escenarios de `login.feature` y pasan.
- [ ] `pnpm e2e` sigue ejecutando los specs Playwright nativos sin cambios ni regresiones.
- [ ] `e2e/login/login.feature` cubre los 3 casos `LOGIN-E2E-001/002/003`.
- [ ] `e2e/login/login.steps.ts` reusa `LoginPage` (no duplica selectores).
- [ ] `e2e/capacitacion/README.md` explica cómo escribir features y steps con un ejemplo end-to-end.
- [ ] `e2e/capacitacion/codegen-ejemplo.md` muestra cómo arrancar `playwright codegen`, dónde apunta el output y cómo convertirlo en steps Gherkin.
- [ ] Todos los commits cierran con mensaje Conventional Commits.

## Non-goals

- No migrar los specs Playwright existentes a Gherkin (sería ruido para QA y no es el objetivo).
- No agregar `@cucumber/cucumber` puro ni Jest-Cucumber (rompe el runner unificado).
- No instalar Cypress ni cambiar de framework.
- No tocar `src/**` ni dependencias runtime.

## Riesgos y mitigación

| Riesgo | Mitigación |
| --- | --- |
| Romper `chromium-authed` / `chromium-clean` al compartir config | Config paralelo dedicado `playwright.bdd.config.ts`. |
| Contaminar el árbol con archivos generados de `bddgen` | `.gitignore` con `.features-gen/` y `e2e/login/.features-gen/` (playwright-bdd default). |
| Confundir a los muchachos con dos runners | Documentar explícitamente que `pnpm e2e` ≠ `pnpm e2e:bdd` y para qué sirve cada uno. |
| `globalSetup` se ejecuta también en BDD y choca con rate-limit | El proyecto BDD usa su propio storage limpia (chromium-clean) y NO usa `chromium-authed`. Los steps interactúan con `/login` directamente. |

## Evidencia / logs

- Lo completaremos a medida que cada task cierre (commit hash + resultado de `pnpm e2e:bdd`).