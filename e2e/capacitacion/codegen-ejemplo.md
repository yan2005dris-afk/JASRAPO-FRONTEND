# Tutorial: Playwright Codegen para escribir tests sin tipear selectores

[`Playwright Codegen`](https://playwright.dev/docs/codegen) es una herramienta
**interactiva** que graba lo que hacés en el browser y genera el código
TypeScript equivalente. Es el atajo más rápido para escribir tests E2E
robustos sin pelearte con CSS selectors.

En este tutorial:

1. Qué es Codegen y cuándo usarlo.
2. Cómo arrancarlo contra la pantalla de login.
3. Cómo grabar una acción y entender la salida.
4. **Cómo convertir la salida en un step definition BDD.**
5. Buenas prácticas y trampas comunes.

---

## 1. Qué es y cuándo usarlo

**Codegen = "generador de código a partir de tu browser".**

Lo que hace:

1. Abre un browser controlado (Chromium por default).
2. Vos interactuás con la app como un usuario real: hacés click, llenás
   formularios, navegás.
3. Codegen registra cada acción y la traduce a un snippet TypeScript con
   el locator más estable que encuentre (`getByRole`, `getByLabel`, etc.).
4. Pegás ese snippet en tu `.steps.ts` (o `.spec.ts` si no usás BDD).

**Cuándo usarlo:**

- ✅ Escribís un test nuevo y querés arrancar con selectores sólidos.
- ✅ Explorás una pantalla nueva y querés ver "qué me ofrece Playwright".
- ✅ Estás haciendo pair-programming con un muchacho nuevo y querés mostrar
  cómo se ve un test real.
- ❌ NO sirve para tests data-driven (no podés tabular inputs).
- ❌ NO sirve para aserciones complejas (eso lo escribís a mano).

---

## 2. Setup: tener el frontend levantado

Codegen necesita una URL accesible. Levantá el frontend:

```bash
pnpm start
# → "Local: http://localhost:4200/"
```

Ya tenés el script npm:

```bash
pnpm e2e:codegen
```

Que equivale a:

```bash
pnpm exec playwright codegen http://localhost:4200/login
```

---

## 3. Arrancar Codegen paso a paso

### 3.1 Comando

```bash
pnpm e2e:codegen
```

Se abren **dos ventanas**:

- **Izquierda:** el browser controlado (la app).
- **Derecha:** el inspector con la grabación en vivo.

![Codegen UI placeholder](https://playwright.dev/img/docs/codegen-ui.png)

### 3.2 Grabar tu primera acción

1. En el browser, **hacé click en el campo "Usuario"** (el de email).
   Vas a ver en el inspector algo como:
   ```ts
   await page.getByLabel('Usuario').click();
   ```
2. **Escribí "admin@jasrapo.com"** en ese campo. Aparece:
   ```ts
   await page.getByLabel('Usuario').fill('admin@jasrapo.com');
   ```
3. **Hacé click en el campo "Contraseña"** y escribí la contraseña.
4. **Hacé click en "Ingresar al Sistema"**. Aparece:
   ```ts
   await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
   ```
5. **Esperá** a que cargue el dashboard. La URL cambió a `/app/dashboard`.

Tenés la grabación completa. Ahora viene lo importante.

### 3.3 Cómo parar la grabación ("hasta acá llega el test")

Tres formas, de más intuitiva a más de emergencia:

| Método                                      | Qué pasa                                                                              | Cuándo usarlo                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Cerrá la ventana del browser**            | Codegen detecta el cierre y termina limpio. El inspector queda abierto con el código. | Cuando querés terminar el flujo normal y llevarte el código. |
| **Botón "Cancel" / "Stop" en el inspector** | El inspector UI mode tiene un botón explícito en la barra superior.                   | En el modo `--ui` (`pnpm e2e:codegen --ui`).                 |
| **`Ctrl+C` en la terminal**                 | Mata el proceso. El código generado se pierde (no se guarda automáticamente).         | Cuando algo se rompe o querés abortar y descartar.           |

**Lo que casi nadie te dice**:

- **El código NO se persiste automáticamente**. Cuando cerrás el browser
  o matás el proceso, lo último que ves en el inspector es lo que tenés.
  Si no lo copiaste, lo perdiste.
- **Truco pro**: mientras el inspector está abierto, podés **seleccionar
  todo** (`Ctrl+A` o `Cmd+A`) y copiar. El botón "Copy" en la UI mode es
  un atajo a lo mismo.
- **Para evitar perder el código**: pegalo en un buffer antes de cerrar
  (`Ctrl+C` en el inspector → pegá en tu editor). Después refinás.

Ejemplo del flujo "hasta acá llega el test":

1. Grabás navegar a `/login`, llenar email, llenar contraseña, hacer click.
2. Llega al dashboard.
3. **Cerrás el browser controlado** (la ventana grande).
4. El inspector queda con el código acumulado — lo seleccionás y copiás.
5. Pegás en tu editor, refactorás, commit.

---

## 4. Convertir la grabación en un step definition BDD

Lo que grabaste es **código Playwright crudo**. Para meterlo en BDD, hay que
**mapear cada línea a un step Gherkin**.

### 4.1 La grabación original

```ts
await page.getByLabel('Usuario').click();
await page.getByLabel('Usuario').fill('admin@jasrapo.com');
await page.getByLabel('contraseña').click();
await page.getByLabel('contraseña').fill('Admin123#');
await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
```

### 4.2 Versión BDD: feature

```gherkin
Escenario: Login generado con codegen
  Dado que el backend mockea el endpoint de autenticación
  Cuando navego a "/login"
  E ingreso "admin@jasrapo.com" en el campo "Usuario"
  E ingreso "Admin123#" en el campo "contraseña"
  Y hago clic en "Ingresar al Sistema"
  Entonces debería estar autenticado
  Y la URL debería ser "/app/dashboard"
```

**Decisiones pedagógicas:**

- `page.getByLabel('Usuario').click()` + `.fill(...)` → **un solo step**:
  `ingreso "admin@jasrapo.com" en el campo "Usuario"`. El `.click()` es
  implícito (Playwright hace focus cuando hacés `.fill()`).
- `page.getByRole('button', { name: '...' }).click()` → **step genérico**:
  `hago clic en "Ingresar al Sistema"`. Reusable en cualquier botón.
- `expect(page).toHaveURL(...)` no aparece en Codegen (no grabás asserts) →
  lo escribimos a mano en un step `Then`.

### 4.3 Versión BDD: step definitions

```ts
// login.steps.ts — fragmentos

When('ingreso {string} en el campo {string}', async ({ page }, value: string, label: string) => {
  await page.getByLabel(label).fill(value); // ← línea exacta del codegen
});

When('hago clic en {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).click(); // ← línea exacta del codegen
});

Then('la URL debería ser {string}', async ({ page }, url: string) => {
  await expect(page).toHaveURL(url);
});
```

**Cada línea del codegen se traduce 1:1 a una línea de un step definition.**
La "traducción" es solo agregar (a) tipado, (b) el patrón Gherkin, y (c)
encapsular en `async (...)`.

---

## 5. Ejercicio guiado: agregar el escenario "logout"

Probá esto en vivo durante la capacitación:

### Paso 1 — Grabar

```bash
pnpm e2e:codegen http://localhost:4200/login
```

Una vez logueado (con el mock prendido), navegá a `/app/dashboard`,
hacé click en el avatar del header y después en "Cerrar Sesión".

### Paso 2 — Limpiar el output

Vas a ver algo como:

```ts
await page.goto('http://localhost:4200/login');
await page.getByLabel('Usuario').click();
await page.getByLabel('Usuario').fill('admin@jasrapo.com');
await page.getByLabel('contraseña').click();
await page.getByLabel('contraseña').fill('Admin123#');
await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
await page.waitForURL('**/app/dashboard');
await page.locator('header').first().getByRole('button').last().click();
await page.getByRole('button', { name: 'Cerrar Sesión' }).click();
await page.waitForURL('**/login');
```

### Paso 3 — Escribir el feature

```gherkin
@login
# LOGIN-E2E-004
Escenario: Logout desde el header devuelve a /login
  Dado que estoy autenticado como admin
  Cuando abro el menú del usuario en el header
  Y hago clic en "Cerrar Sesión"
  Entonces la URL debería contener "/login"
```

### Paso 4 — Implementar los steps nuevos

`hago clic en "{string}"` ya existe. Solo faltan dos:

```ts
Given('que estoy autenticado como admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill('admin@jasrapo.com');
  await page.getByLabel('contraseña').fill('Admin123#');
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await page.waitForURL(/\/app/);
});

Given('abro el menú del usuario en el header', async ({ page }) => {
  // Línea exacta del codegen:
  await page.locator('header').first().getByRole('button').last().click();
});
```

### Paso 5 — Correr

```bash
pnpm e2e:bdd --grep "LOGIN-E2E-004"
```

---

## 6. Buenas prácticas con Codegen

### 6.1 Sí

- ✅ **Pegá el snippet tal cual** y solo agregale tipado.
- ✅ **Preferí `getByRole` / `getByLabel` / `getByText`** sobre CSS selectors.
  Si Codegen te ofrece un `.locator('div > span:nth-child(3)')`, ignorá ese
  fragmento y escribí el selector a mano basado en la UI.
- ✅ **Encapsulá en POM cuando aplique.** Si el snippet tiene más de 3
  líneas para una sola interacción, va al POM (`e2e/base-page.ts`).
- ✅ **Usá Codegen como punto de partida, no como verdad final.** Revisá
  que los selectors sean robustos antes de commitear.

### 6.2 No

- ❌ **No copies `waitForTimeout`.** Codegen a veces lo agrega. Reemplazá
  por `expect(locator).toBeVisible()` o `page.waitForURL(...)`.
- ❌ **No copies IDs generados como `data-testid="..."` ciegos** sin
  confirmar con QA que son estables.
- ❌ **No metas el codegen crudo en el step definition.** Refactorizá:
  una línea de codegen → una línea en el step. No copies el `.goto()`,
  el `.click()` y el `.fill()` adentro de un mismo step.

---

## 7. Trampas comunes

### "Codegen no me genera nada"

Probable causa: la página no terminó de cargar. Esperá a que la red esté
quieta antes de empezar a interactuar. El indicador visual es el icono de
"cargando" en el inspector.

### "El selector que me dio es `div:nth-child(2) > ...`"

Codegen a veces cae en CSS feo cuando no hay roles/labels accesibles. Pasos:

1. Abrí DevTools (F12) en el browser controlado.
2. Inspeccioná el elemento.
3. Buscá un `aria-label`, `role`, o texto accesible.
4. Reemplazá el selector por `getByRole` o `getByLabel` con esos valores.

### "El step no matchea con el feature"

Dos causas típicas:

- Tildes/espacios distintos (`"Contraseña"` vs `"Contrasena"`).
- Comillas distintas (`"..."` vs `«...»` o `'...'`).

Gherkin es **estricto**. El string literal del feature tiene que ser idéntico
al string literal del step definition.

---

## 8. Recursos

- [Playwright Codegen docs](https://playwright.dev/docs/codegen)
- [Playwright Locators](https://playwright.dev/docs/locators)
- [Best practices](https://playwright.dev/docs/best-practices)
- [`README.md`](./README.md) → tutorial general de BDD
