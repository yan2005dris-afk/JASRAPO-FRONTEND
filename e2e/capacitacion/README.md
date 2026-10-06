# Capacitación BDD con Playwright (Cucumber/Gherkin)

Material de entrenamiento para los muchachos que se incorporan al equipo.
Acá vas a encontrar:

1. **Cómo escribir un `.feature`** en Gherkin en español.
2. **Cómo escribir los step definitions** (el "código" que ejecuta cada paso).
3. **Cómo correr y regenerar** la suite BDD.
4. **Cómo agregar un escenario nuevo** de cero.

El ejemplo vivo está en [`../login/`](../login/) (mirá `login.feature`,
`login.steps.ts` y `login.md` para ver los IDs y la trazabilidad).

---

## 1. Antes de empezar: qué es BDD y por qué nos sirve

BDD = **Behavior-Driven Development**. Escribimos los tests como **lenguaje
de negocio** en archivos `.feature` (Gherkin), y abajo va el **`step definition`**
que dice qué pasa en código cuando se ejecuta cada línea.

**¿Por qué?**

- QA, producto y devs hablamos **el mismo idioma** (`Dado que / Cuando /
  Entonces`).
- El feature es **documentación ejecutable**: lo que está en el `.feature`
  se valida en CI.
- Los `.feature` son **estables** cuando el código cambia: si reescribís un
  step interno, el scenario sigue diciendo lo mismo.

**¿Por qué no Cucumber puro?**

Porque `playwright-bdd` nos da **lo mejor de los dos mundos**:

- ✅ Gherkin estándar (Cucumber).
- ✅ Runner de Playwright (traces, screenshots, videos, sharding, UI mode).
- ✅ Reusamos los mismos POMs (`LoginPage`, etc.) que ya tenemos.
- ✅ Cero configuración nueva para mocks (`page.route` directo).

---

## 2. Setup local (5 minutos)

### 2.1 Instalar dependencias

El setup ya está en este repo:

```bash
pnpm install
pnpm exec playwright install chromium   # una sola vez
```

### 2.2 Levantar el frontend

```bash
pnpm start
# → "Local: http://localhost:4200/"
```

No necesitás el backend para los escenarios de este README porque el feature
de login trae un `Given` que mockea el endpoint `/api/v1/auth/login` con
respuestas hardcoded.

Si querés levantar el backend real (recomendado para escenarios más
complejos):

```bash
docker compose up backend postgres redis
```

### 2.3 Correr la suite BDD

```bash
pnpm e2e:bdd
```

El script auto-corre `bddgen` (regenera el `.features-gen/`) y después
ejecuta los tests con Playwright. Salida esperada:

```
Running 3 tests using 1 worker
  ✓  pantalla de login › Mostrar la pantalla de login y sus campos
  ✓  pantalla de login › Login exitoso con admin redirige al dashboard
  ✓  pantalla de login › Login con credenciales inválidas muestra error y no redirige
  3 passed (6s)
```

### 2.4 Ver el browser mientras corre (capacitación)

Durante la capacitación es clave que los muchachos **vean** lo que el test
está haciendo, no solo lean el log. Tres modos disponibles:

| Script                 | Qué hace                                                                  | Cuándo usarlo                                  |
| ---------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| `pnpm e2e:bdd:headed`  | Abre el browser Chromium visible y ejecuta los tests paso a paso.        | Para ver el flujo completo. |
| `pnpm e2e:bdd:ui`      | Abre el [Playwright UI mode](https://playwright.dev/docs/test-ui) con time-travel entre steps. | Para debuggear un escenario puntual. |
| `pnpm e2e:bdd:debug`   | Igual a headed pero con el inspector de Node atado (breakpoints).         | Para debug profundo. |

```bash
pnpm e2e:bdd:headed --grep "Login exitoso"   # solo ese escenario, con browser abierto
pnpm e2e:bdd:ui                              # UI mode: ves cada step con screenshots intermedios
```

> ⚠️ `headed`, `ui` y `debug` requieren un display X/Wayland. En CI o en
> servidores sin display, no funcionan — usá `pnpm e2e:bdd` (headless).

Reportes:

- HTML de Playwright → `playwright-report-bdd/` (no se commitea).
- Artefactos de fallos (screenshots, videos, traces) → `test-results/`.

### 2.4 Filtrar por tags

Cada escenario tiene `@login` y la feature tiene `@critical`. Podés correr un
subconjunto:

```bash
pnpm e2e:bdd --grep @login      # solo escenarios de login
pnpm e2e:bdd --grep @critical   # todos los críticos
pnpm e2e:bdd --grep "exitoso"   # por título del scenario
```

---

## 3. Anatomía de un `.feature`

Mirá [`../login/login.feature`](../login/login.feature) mientras leés:

```gherkin
# language: es
#
# Comentario libre: podés documentar el propósito del archivo, IDs de QA,
# referencias a issues, etc. NO se ejecutan.

@critical                                # tag a nivel de Feature: aplica a TODOS los escenarios
Característica: pantalla de login        # keyword OBLIGATORIA en español (con `language: es`)
  Como persona usuaria del sistema       # línea opcional pero recomendada: rol
  Quiero autenticarme en /login         #              qué quiere lograr
  Para acceder al dashboard y a          #              por qué le importa
      las funcionalidades autenticadas

  @login                                 # tag a nivel de Escenario
  # LOGIN-E2E-001                        # ID correlacionado con e2e/login/login.md
  Escenario: Mostrar la pantalla de login y sus campos   # keyword obligatoria
    Cuando navego a "/login"             # cada paso es UN step definition
    Entonces debería ver el campo "Usuario"
    Y debería ver el campo "contraseña"
    Y debería ver el botón "Ingresar al Sistema"
```

### 3.1 Keywords en español (con `language: es`)

| Español          | Inglés          | Uso                |
| ---------------- | --------------- | ------------------ |
| `Característica` | `Feature`       | Nombre del feature |
| `Escenario`      | `Scenario`      | Un caso de prueba  |
| `Esquema del escenario` | `Scenario Outline` | Caso data-driven |
| `Ejemplos`       | `Examples`      | Tabla de datos para outline |
| `Antecedentes`   | `Background`    | Pasos comunes a todos los escenarios |
| `Dado`           | `Given`         | Precondición       |
| `Cuando`         | `When`          | Acción             |
| `Entonces`       | `Then`          | Aserción           |
| `Y` / `E`       | `And`           | Encadenar pasos    |
| `Pero`           | `But`           | Encadenar pasos    |

> ⚠️ Si mezclás keywords (ej. `Feature:` en vez de `Característica:`) el
> parser falla. Mantené consistencia.

### 3.2 Tags

Los tags son libres pero acá seguimos una convención:

- `@<feature>` → agrupa por feature (`@billing`, `@login`).
- `@critical` / `@smoke` / `@regression` → prioridad.
- `@<ID-legacy>` → IDs del suite de QA previo (mirá `login.md`).

Más info sobre tags y filtros: https://github.com/cucumber/tag-expressions.

### 3.3 Parámetros en los pasos

Gherkin soporta "expresiones Cucumber" que capturan valores:

- `{string}` → string entre comillas: `"admin@jasrapo.com"`.
- `{int}` → entero: `42`.
- `{word}` → palabra sin espacios: `admin`.

Ejemplo:

```gherkin
Cuando navego a "/login"
E ingreso "admin@jasrapo.com" en el campo "Usuario"
```

Estos dos pasos matchean los definitions:

```ts
When('navego a {string}', async ({ page }, path: string) => { ... });
When('ingreso {string} en el campo {string}', async ({ page }, value: string, label: string) => { ... });
```

---

## 4. Anatomía de un step definition

Mirá [`../login/login.steps.ts`](../login/login.steps.ts) mientras leés:

```ts
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { LoginPage } from '../base-page';

const { Given, When, Then } = createBdd();

// ---- Navegación -----------------------------------------------------------
When('navego a {string}', async ({ page }, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
});
```

### 4.1 Reglas de oro

1. **Cada paso del feature tiene su propio step acá.** NO colapses 5 pasos
   en un `Given` gigante: perdes el mapeo 1:1 entre lenguaje natural y código.
2. **Reusá el POM (`LoginPage`, etc.).** Los selectors viven en un solo
   lugar. Si cambia el DOM, solo tocás `e2e/base-page.ts`.
3. **Los steps son genéricos cuando se puede.** `debería ver el campo
   "{string}"` sirve para login, contratos, lo que sea.
4. **Para producción, hacé steps específicos.** Si dos features distintas
   definen el campo "Usuario" con semántica diferente, renombrá el step a
   `debería ver el campo Usuario del formulario de login`.
5. **Validá con buenas prácticas de Playwright:**
   - Preferí `getByRole`, `getByLabel`, `getByText` sobre CSS selectors.
   - Evitá `page.waitForTimeout`: usá `expect(locator).toBeVisible()`.
   - Usá el POM para encapsular selectores complejos.

### 4.2 Mocks del backend

`page.route` vive en un `Given` separado para que el scenario sea explícito:

```gherkin
Dado que el backend mockea el endpoint de autenticación
Cuando navego a "/login"
E ingreso "admin@jasrapo.com" en el campo "Usuario"
...
```

El step asociado vive en `login.steps.ts`. Mirá
[`que el backend mockea el endpoint de autenticación`](../login/login.steps.ts)
para ver el patrón completo con `route.fulfill()`.

### 4.3 Patrones avanzados (para referencia)

| Patrón                         | Cuándo usarlo                           |
| ------------------------------ | --------------------------------------- |
| `Before` / `After` hooks       | Setup/teardown **por scenario**. Solo en cucumber-style con `worldFixture`. |
| `BeforeAll` / `AfterAll`       | Setup/teardown **por archivo**. Idem.   |
| Step decorators (`@Given`/`@When`/`@Then` en clases POM) | Cuando los steps están atados a un POM. |
| `Scenario Outline`             | Tablas de datos con `Ejemplos`.         |

Para nuestro caso de uso actual (capacitación), alcanza con
`Given/When/Then` + `page.route` en `Given`. Las otras opciones las
agregamos si aparecen casos que las justifiquen.

---

## 5. Agregar un escenario nuevo (paso a paso)

Ejemplo: agregar "logout desde el header" al feature de login.

### 5.1 Editá `login.feature`

Agregá un escenario al final:

```gherkin
  @login
  # LOGIN-E2E-004
  Escenario: Logout desde el header
    Dado que estoy autenticado como admin
    Y abro el menú del usuario en el header
    Cuando hago clic en "Cerrar Sesión"
    Entonces la URL debería contener "/login"
```

### 5.2 Implementá los steps nuevos (si hace falta)

Los pasos `navego a`, `hago clic en`, `la URL debería contener` ya existen
de los escenarios anteriores. Solo necesitás implementar los nuevos:

```ts
// en login.steps.ts
Given('que estoy autenticado como admin', async ({ page }) => {
  // Reusamos el helper de e2e/helpers.ts para evitar duplicación.
  await page.goto('/login');
  await page.getByLabel('Usuario').fill('admin@jasrapo.com');
  await page.getByLabel('contraseña').fill('Admin123#');
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await page.waitForURL(/\/app/);
});

Given('abro el menú del usuario en el header', async ({ page }) => {
  await page.locator('header').first().getByRole('button').last().click();
});
```

### 5.3 Regenerá y corré

```bash
pnpm e2e:bdd
```

`e2e:bdd` corre `bddgen` automáticamente; no te olvides nunca más.

### 5.4 Si un step no matchea

El runner te avisa con un mensaje claro tipo:

```
Error: Undefined step: "abro el menú del usuario en el header"
```

Dos causas:
- **Typo en el step vs el feature.** Revisá que coincidan exactamente (case,
  espacios, tildes).
- **Step no implementado.** Agregalo a `login.steps.ts`.

---

## 6. Diferencias con `e2e` (Playwright clásico)

| Concepto              | `pnpm e2e` (Playwright nativo) | `pnpm e2e:bdd` (BDD)               |
| --------------------- | ------------------------------ | ---------------------------------- |
| Archivos              | `*.spec.ts`                    | `*.feature` + `*.steps.ts`         |
| Estructura del test   | `test.describe` + `test()`     | `Característica` + `Escenario`     |
| Reuso                 | Page Objects (`LoginPage`)     | Page Objects **+** steps genéricos |
| Auto-storage session  | `globalSetup` con rate-limit   | No (BDD empieza limpio siempre)   |
| Reporte             | `playwright-report/`           | `playwright-report-bdd/`           |
| Cuándo usarlo         | Tests de regresión, smoke      | Capacitación + tests data-driven   |

**Reglas de convivencia:**

- Los dos configs son **paralelos** (`playwright.config.ts` vs
  `playwright.bdd.config.ts`). NO se mezclan.
- Si encontrás un bug en el POM, lo arregla el config nativo primero y
  después se ve reflejado en BDD.
- NO migres specs nativos a BDD sin discutirlo. Cada formato tiene su lugar.

---

## 7. Recursos

- [Tutorial oficial de playwright-bdd](https://vitalets.github.io/playwright-bdd/#/getting-started/index)
- [Gherkin en español](https://cucumber.io/docs/gherkin/languages/)
- [Cucumber tag expressions](https://github.com/cucumber/tag-expressions)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
- [`codegen-ejemplo.md`](./codegen-ejemplo.md) → tutorial de Playwright Codegen