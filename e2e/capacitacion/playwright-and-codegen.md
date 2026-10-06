# Playwright & Codegen: cómo funciona y cómo escribir tests que sobrevivan

> Material conceptual para entender **cómo piensa Playwright** antes de tirar
> líneas. Si entendés los principios, Codegen deja de ser una caja mágica y
> pasa a ser un acelerador; y tus tests dejan de romperse cada vez que el
> frontend cambia.

**Audiencia**: devs que ya tocaron Playwright o que están por arrancar, y
quieren entender por qué las cosas son como son antes de copiar/pegar.

**No es**: un tutorial de "cómo correr el primer test". Para eso hay docs
oficiales ([playwright.dev](https://playwright.dev/docs/intro)) y otros
materiales de este repo (`README.md`, `codegen-ejemplo.md`).

---

## 1. Qué problema resuelve Playwright (y por qué existe)

Antes de Playwright y su par (Cypress, Selenium, etc.) la **pirámide de
automatización de UI** tenía un agujero:

- **Unit tests** eran rápidos y baratos pero no cruzaban el sistema.
- **E2E con scripts propios** (`fetch` + aserciones) eran lentos, frágiles
  y siempre dos años atrasados respecto al frontend.
- **QA manual** cubría el flujo real pero no escalaba.

Playwright ocupa ese hueco: **automatización cross-browser que arranca rápido
y se mantiene estable** mientras el frontend evoluciona. El truco para que
funcione está en tres decisiones de diseño que vamos a desarmar:

1. **Auto-wait** — el runner espera solo, no necesita `sleep`.
2. **Actionability checks** — antes de cualquier acción, valida 5 condiciones.
3. **Selectors accesibles primero** — `getByRole` / `getByLabel` antes que
   `#id`.

Codegen existe porque la mayoría de los devs (y muchos QAs) **no conocen
estos principios al escribir su primer test**. Codegen aplica los principios
**por defecto** y muestra, en tiempo real, qué es una buena elección de
selector.

---

## 2. Cómo funciona Playwright por dentro

### 2.1 La diferencia entre Selenium "viejo" y Playwright

| Aspecto              | Selenium clásico                | Playwright                            |
| -------------------- | ----------------------------- | ------------------------------------ |
| Comunicación         | WebDriver (W3C protocol)      | WebSocket directo al browser process |
| Auto-wait            | Manual (`waitFor*`)           | Built-in en cada acción              |
| Selectors            | CSS / XPath por default       | Accesibles por default + CSS/XPath   |
| Multi-tab / iframe   | Complejo, propenso a fugas    | Nativo en la API                     |
| Actionability        | A veces la app cambia           | Bug no: el runner lo precede           |
| Trace debugging      | Manual                        | Trace viewer con timeline             |

Lo importante: Playwright **no espera que vos le digas vas a esperar**. Él
mismo mira el DOM, observa la red, mira los frames, y solo dispara la acción
cuando está seguro de que el elemento está listo.

### 2.2 Auto-wait: cómo decide cuándo actuar

Cuando llamás `await page.getByRole('button').click()`, Playwright hace esto
internamente:

```
1. ¿El elemento existe en el DOM?          → si no, polling 100ms hasta timeout
2. ¿Es visible? (no display:none, no 0x0) → si no, polling
3. ¿Es estable? (no en movimiento)         → si no, polling
4. ¿Recibe eventos? (no cubierto por otro) → si no, polling
5. ¿Está habilitado? (no disabled)         → si no, polling
6. ACTIONA.                                  ← solo si las 5 son true
```

Eso son los **"Actionability checks"** y los podés ver uno por uno en la
[doc oficial](https://playwright.dev/docs/actionability). Lo crítico es entender:

- **No hay sleeps en ningún lado**. Si tu test tiene `waitForTimeout`, malo.
  Significa que estás peleando contra el auto-wait.
- **Si un selector estricto falla**, Playwright te tira un mensaje claro tipo
  *"strict mode violation: getByLabel resolved to 2 elements"*. Aprendé a
  leerlos, son tu GPS.
- **Si el elemento está "covered by another element"**, hay un overlay o un
  modal encima. Cerrá el overlay antes, no forcees el click.

### 2.3 Selectors: por qué `getByRole` > `#id` > XPath

Playwright soporta CSS, XPath, texto, role ARIA, label, placeholder, test-id,
etc. **El orden importa**. Cuando elegís un selector, estás eligiendo un
contrato con la app:

```ts
// MAL: contrato con la implementación. Si mañana el botón cambia de id, se rompe.
page.locator('#submit-btn').click();

// MAL: contrato con la estructura del DOM. Frágil a cualquier refactor.
page.locator('form > div:nth-child(3) > button').click();

// BIEN: contrato con lo que el usuario ve. Robusto a refactors.
page.getByRole('button', { name: 'Iniciar Sesión' }).click();

// BIEN: contrato con el label accesible.
page.getByLabel('Usuario').fill('admin@jasrapo.com');

// ÚLTIMO RECURSO: contrato con un test-id explícito (preferido por QA).
page.getByTestId('submit-button').click();
```

**Por qué `getByRole` gana**:

1. Es **lo que el usuario** ve (un screen reader anuncia "button: Iniciar
   Sesión").
2. **No cambia** cuando refactorizan CSS, dividen un componente, mueven
   cosas de carpeta.
3. Es **auto-documentado**: cualquiera que lee el test sabe qué busca sin
   mirar el HTML.

Codegen genera **siempre** el mejor selector disponible. Si vos escribís a
mano, mantené la misma jerarquía.

### 2.4 Fixtures: cómo se compone el contexto del test

Playwright tiene un sistema de **dependency injection** vía `test.extend()`:

```ts
const test = base.extend({
  // Se ejecuta UNA vez por test. Limpieza automática al final.
  myFixture: async ({ page }, use) => {
    await page.goto('/login');
    await use({ username: 'admin' });   // ← disponible en el test
    await page.close();                  // ← cleanup automático
  },
});
```

Las fixtures nativas (`page`, `context`, `browser`, `request`) vienen
pre-armadas. Las que vos agregás se inyectan como argumento de `test()` o de
cada step.

**Por qué importa entenderlos: los Page Objects viven exactamente arriba de
este mecanismo.**

### 2.5 Lo que Playwright NO hace por vos

Tres cosas que siguen siendo tu responsabilidad:

1. **Esperar condiciones de negocio**. "Espero que la factura se creó" no es
   lo mismo que "el botón está habilitado". A veces hay que hacer polling de
   un GET hasta que devuelva el recurso creado.
2. **Limpiar estado entre tests**. Playwright da un context fresco por test,
   pero tu backend (DB, cache) puede tener datos que sobreviven. Usa
   `globalSetup` / `globalTeardown` o fixtures de "test data builder".
3. **Decidir QUÉ probar**. La estrategia de testing (qué vale la pena
   automatizar) sigue siendo criterio humano.

---

## 3. Qué es Codegen y por qué existe

### 3.1 El problema humano

Si te sentás a escribir un test E2E sin conocer Playwright, lo más probable
es que:

1. Abrás DevTools, copies un CSS selector.
2. Escribás `await page.click(...)` con un timeout generoso.
3. El test pase una vez.
4. A la semana siguiente se rompe porque alguien refactorizó un componente.
5. Repetís hasta que el test sea más grande que el feature que prueba.

Codegen invierte este ciclo: **hacé lo que el usuario hace primero, codegen
lo traduce a código después**. El beneficio es que el selector que Codegen
elige está basado en heurísticas, no en tu "adivina el CSS":

- Si hay un `aria-label`, lo usa.
- Si hay un label visible, usa `getByLabel`.
- Si hay un rol semántico claro, usa `getByRole`.
- Solo si no hay nada accesible, cae a CSS.

### 3.2 Qué ve Codegen

Cuando arrancás `playwright codegen http://localhost:4200/login`, se abre
**un browser controlado por vos + un inspector con la grabación**. Cada
acción genera código en el inspector en tiempo real.

Ejemplo de interacción y la salida que vas a ver:

| Acción del usuario                  | Código generado                                            |
| ----------------------------------- | ---------------------------------------------------------- |
| Hacé click en el input email        | `await page.getByLabel('Usuario').click();`               |
| Tipeá "admin@jasrapo.com"           | `await page.getByLabel('Usuario').fill('admin@jasrapo.com');` |
| Hacé click en el input contraseña   | `await page.getByLabel('contraseña').click();`             |
| Tipeá la contraseña                 | `await page.getByLabel('contraseña').fill('Admin123#');`    |
| Hacé click en "Ingresar al Sistema" | `await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();` |
| Esperá a la URL `/app/dashboard`    | `await page.waitForURL('**/app/dashboard');`               |

**El código es correcto PERO crudo. Refinar es trabajo tuyo.**

### 3.3 Lo que Codegen NO hace

Codegen es un **traductor literal**, no un diseñador de tests. Estas cosas
las tenés que hacer a mano:

1. **Aserciones**. Codegen no genera `expect(...)`. Las escribís vos.
2. **Parámetros variables**. Codegen hardcodea "admin@jasrapo.com". Lo que
   vos hacés es moverlo a una constante o un builder.
3. **Lógica condicional**. "¿Si el modal aparece, cerrálo" no se graba.
4. **Reuso**. Cada interacción se graba completa; vos agrupás en Page
   Objects.
5. **Mocks / route handlers**. Codegen no intercepta llamadas — eso es
   `page.route`, otra bestia.

---

## 4. Anatomía del código que genera Codegen

Veamos línea por línea y por qué cada parte es como es.

### 4.1 `await page.getByLabel('Usuario').fill('admin@jasrapo.com')`

- **`page`**: fixture global de Playwright. Una tab del browser.
- **`getByLabel('Usuario')`**: busca el `<input>` cuyo `<label>` (visible o
  `aria-labelledby`) dice "Usuario". Si hay más de uno, strict mode
  failure.
- **`.fill(...)`**: type-and-replace. Borra lo que había, escribe el nuevo
  valor, dispara eventos de input (no es `keyboard.type` con un caracter
  por evento).

**Alternativa que Codegen podría haber elegido**:

```ts
await page.locator('#email').fill(...);            // selector CSS
await page.locator('input[name="email"]').fill(...); // selector atributo
```

Ninguna es mejor que `getByLabel` si el label existe. Codegen prefiere
labels porque son **lo que el usuario ve**.

### 4.2 `await page.getByRole('button', { name: 'Ingresar al Sistema' }).click()`

- **`getByRole('button', ...)`**: busca por ARIA role. `'button'` es el
  valor estándar de `<button>` y `<input type="submit">`.
- **`{ name: '...' }`**: el **accessible name**, que es el texto que un
  screen reader anunciaría. Se calcula del texto del botón, `aria-label`,
  `aria-labelledby`, etc.

**Por qué `.click()` y no `.tap()`**: en desktop, `.click()` dispara un
evento `click` real (mousedown + mouseup). En touch, `.tap()` es lo
correcto. Codegen elige según el dispositivo del proyecto.

### 4.3 `await page.waitForURL('**/app/dashboard')`

- **`waitForURL`**: espera a que la URL matchee el glob. Internamente hace
  polling del `location.href` cada ~100ms.
- **`**/app/dashboard`**: glob. `**` matchea cualquier path. Alternativa:
  regex `/\/app\/dashboard$/`.

**Alternativa más moderna** (y que Codegen no genera):

```ts
await expect(page).toHaveURL(/\/app\/dashboard/);
```

¿Por qué? Porque `expect.toHaveURL` tiene mejor mensaje de error si falla:

```
Expected: /\/app\/dashboard/
Received: "http://localhost:4200/login"
```

`waitForURL` solo tira timeout. La regla: **preferí `expect` sobre waits
cuando esperás un estado asertable**.

---

## 5. Cómo traducir lo grabado a test mantenible

### 5.1 El test "crudo" de Codegen

```ts
test('login admin', async ({ page }) => {
  await page.goto('http://localhost:4200/login');
  await page.getByLabel('Usuario').click();
  await page.getByLabel('Usuario').fill('admin@jasrapo.com');
  await page.getByLabel('contraseña').click();
  await page.getByLabel('contraseña').fill('Admin123#');
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await page.waitForURL('**/app/dashboard');
});
```

Funciona, pero tiene 3 problemas:

1. **Repite selectores** que ya conocés.
2. **No tiene una intención clara** — el lector tiene que reconstruirla.
3. **Cualquier refactor del HTML rompe múltiples líneas**.

### 5.2 Versión refactorizada con Page Object

```ts
// login.page.ts
class LoginPage {
  constructor(private page: Page) {}

  private get emailInput() { return this.page.locator('#email'); }
  private get passwordInput() { return this.page.locator('#password'); }
  private get submitButton() { return this.page.getByRole('button', { name: 'Ingresar al Sistema' }); }

  async goto() { await this.page.goto('/login'); }
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// login.spec.ts
test('login admin redirige al dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('admin@jasrapo.com', 'Admin123#');
  await expect(page).toHaveURL(/\/app\/dashboard/);
});
```

**Lo que cambió**:

- Los selectores están en **un solo lugar**. Si cambia el HTML, tocás un
  archivo.
- El test lee como **lenguaje humano** — `loginPage.login(...)` es lo que
  hace el usuario.
- Las credenciales hardcodeadas son **un argumento**, no una copia literal.
  Cuando muevas a fixtures, es un cambio chiquito.

### 5.3 Reglas para escribir el Page Object bien

1. **Un Page Object por pantalla**, no por test. Si tenés 10 tests sobre
   login, todos usan el mismo `LoginPage`.
2. **Locators privados**. Expongan métodos (`login()`, `logout()`), no
   locators crudos. El test no debería saber que el input se llama `#email`.
4. **Locators "lazy"**. Usá getters (`get emailInput()`) en vez de campos
   calculados en el constructor. Razón: los locators se evalúan cuando se
   usan, no cuando se construye el objeto. Si la página cambia antes de
   usar el locator, el getter lee el estado actual, no un snapshot viejo.
5. **Una acción por método**. `login()` agrupa 3 acciones del usuario; eso
   está bien porque conceptualmente es **una sola acción de negocio**.
6. **Sin asserts adentro del POM**. El POM actúa. El test aserta. Si el POM
   empieza a verificar cosas, se acopla al test.

### 5.4 De Codegen a POM: el mapeo

| Lo que genera Codegen                     | A dónde va en el POM          |
| ---------------------------------------- | --------------------------- |
| `getByLabel('Usuario')`                  | `get emailInput()`          |
| `getByLabel('contraseña')`              | `get passwordInput()`       |
| `getByRole('button', { name: '...' })`  | `get submitButton()`        |
| La secuencia fill-fill-click             | `login(email, password)`    |

Si ves un patrón de 3+ líneas en tu test que se va a repetir, **es candidato
a POM**. Si es una sola línea, dejala en el test.

---

## 6. Cómo encaja Codegen en el flujo de trabajo

### 6.1 Cuándo usarlo (y cuándo NO)

✅ **Usalo cuando**:

- Estás explorando una pantalla nueva y querés ver qué te ofrece Playwright.
- Estás haciendo pair programming con alguien nuevo y querés mostrar "qué
  hace Playwright".
- Necesitás escribir varios tests sobre la misma pantalla — Codegen te da
  los selectores base, vos refactorás a POM.

❌ **NO lo uses cuando**:

- Estás escribiendo tests data-driven con `forEach` o `test.each()`.
- Estás escribiendo tests de API (no hay UI para grabar).
- Estás ajustando tests existentes — los selectores ya están, refinar a
  mano es más rápido.

### 6.2 El workflow recomendado

1. **Exploración**: navegá manualmente la pantalla con DevTools abierto.
   Identificá los elementos clave (inputs, botones, mensajes).
2. **Grabación base**: corré `playwright codegen`. Hacé el flujo principal
   una vez. Copiá el código generado.
3. **Selección de locators**: revisá cada locator generado. ¿Es
   `getByRole`/`getByLabel` o cayó a CSS? Si cayó a CSS, mirá si hay un
   label accesible que no estás usando.
4. **Refactor a POM**: mové los locators a un Page Object. Convertí
   secuencias de acciones en métodos con nombre.
5. **Aserciones**: agregá `expect(...)` en los puntos críticos. NO copies
   los waits que Codegen haya metido (`waitForTimeout`).
6. **Parametrización**: si los valores van a variar, movelos a fixtures o a
   datos del test.
7. **Cobertura de negativos**: agregá tests para los flujos de error
   (credenciales inválidas, modal que se cierra, etc.). Codegen no hace
   esto.

### 6.3 El test ideal — checklist

Cuando termines de escribir un test, validá que cumple:

- [ ] **El test se lee como una historia.** Si lo lee alguien que no escribió
    el código, entiende QUÉ se está probando sin abrir la app.
- [ ] **Los selectores son accesibles primero.** `getByRole` > `getByLabel`
    > `getByTestId` > `#id` > CSS path.
- [ ] **No hay `waitForTimeout`.** Si lo hay, estás peleando contra el
    auto-wait. Refactorizá.
- [ ] **Las acciones del usuario están agrupadas.** `login(email, pass)` no
    5 lines separadas.
- [ ] **Las aserciones son específicas.** `expect(text).toContain('...')` no
    `expect(text).toBeTruthy()`.
- [ ] **El test es independiente.** No depende del orden, no contamina el
    estado de otros tests.
- [ ] **Si cambia la UI, hay UN lugar donde tocar.** Los locators viven en
    el POM, no en el test.

---

## 7. Errores comunes (y cómo se ven en el código)

### 7.1 Anti-patrón: selector frágil

```ts
// MAL: contrato con la implementación
await page.locator('div.login-card > form > div:nth-child(2) > input').fill('admin');

// BIEN: contrato con el usuario
await page.getByLabel('Usuario').fill('admin');
```

### 7.2 Anti-patrón: wait explícito

```ts
// MAL: peleando contra el runner
await page.click('#submit');
await page.waitForTimeout(2000);  // "por las dudas"
await expect(page.locator('.success')).toBeVisible();

// BIEN: dejar que el runner espere solo
await page.getByRole('button', { name: 'Enviar' }).click();
await expect(page.getByText('Enviado')).toBeVisible();
```

### 7.3 Anti-patrón: test monolítico

```ts
// MAL: 100 líneas que nadie mantiene
test('flujo completo de login a dashboard', async ({ page }) => { /* ... */ });

// BIEN: tests chiquitos con intención clara
test('login con creds válidas redirige a dashboard');
test('login con creds inválidas muestra error');
test('logout desde el header vuelve a /login');
```

### 7.4 Anti-patrón: lógica condicional en el test

```ts
// MAL: el test "se adapta" según el entorno
if (process.env.CI) {
  await page.waitForTimeout(5000);
}

// BIEN: el test es el mismo en todos lados
await expect(page.getByText('Resultado')).toBeVisible({ timeout: 10000 });
```

### 7.5 Anti-patrón: aserciones vagas

```ts
// MAL: pasa aunque algo esté mal
await expect(page.locator('body')).toBeTruthy();

// BIEN: aserción específica y útil
await expect(page.getByText('Planilla generada')).toBeVisible();
```

### 7.6 Anti-patrón: pollito de un día

```ts
// MAL: selector que matchea el código real HOY pero va a romperse en el
// próximo refactor
await page.locator('body > app-root > app-login > div > form > button').click();

// BIEN: rol semántico
await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
```

---

## 8. Recursos para profundizar

### 8.1 Documentación oficial

- [Playwright docs](https://playwright.dev/docs/intro) — start here
- [Actionability](https://playwright.dev/docs/actionability) — las 5 reglas
- [Locators](https://playwright.dev/docs/locators) — guía de selectores
- [Codegen](https://playwright.dev/docs/codegen) — referencia del tool
- [Best practices](https://playwright.dev/docs/best-practices) — guía oficial
- [Trace viewer](https://playwright.dev/docs/trace-viewer) — debugger

### 8.2 Lecturas recomendadas

- *"Writing Maintainable Tests"* — talks de Playwright team en YouTube.
- *"Don't sleep on auto-wait"* — blog posts sobre el modelo de Playwright.
- *"Page Object pattern"* — Martin Fowler, 2013. La idea base del POM.

### 8.3 En este repo

- `capacitacion/README.md` — tutorial paso a paso para escribir features y
  steps BDD con `playwright-bdd`.
- `capacitacion/codegen-ejemplo.md` — tutorial hands-on con un ejercicio
  "logout".
- `odd/tasks/e2e-cucumber-capacitacion.md` — task doc de la feature.

---

## 9. TL;DR

1. **Playwright espera solo.** No le digas vas a esperar; si tenés
   `waitForTimeout`, refactorizá.
2. **Selectors accesibles primero.** `getByRole` > `getByLabel` >
   `getByTestId` > CSS.
3. **Codegen acelera, no diseña.** Refinar el código generado es trabajo
   tuyo.
4. **Encapsulá en Page Objects.** Locators privados, métodos públicos con
   intención de negocio, asserts fuera del POM.
5. **El test se lee como historia.** Si alguien que no escribió el código
   no lo entiende, refactorizá.
6. **Aserciones específicas.** `expect(...).toBeVisible()` sobre
   `expect(...).toBeTruthy()` siempre.