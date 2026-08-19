### E2E Tests: Login

**Suite ID:** `LOGIN-E2E`
**Feature:** Autenticación de usuarios

---

## Test Case: `LOGIN-E2E-001` - Muestra la pantalla de login y sus campos

**Priority:** `critical`

**Tags:**
- type → @e2e
- feature → @login

**Description/Objective:** Verificar que la pantalla de login se renderiza con sus campos.

**Preconditions:**
- Frontend corriendo en `http://127.0.0.1:4200`

### Flow Steps:
1. Navegar a `/login`
2. Verificar campos Usuario y contraseña

### Expected Result:
- Campos visibles, botón "Iniciar Sesión" visible

---

## Test Case: `LOGIN-E2E-002` - Login exitoso con admin

**Priority:** `critical`

**Tags:**
- type → @e2e
- feature → @login

**Description/Objective:** Verificar autenticación con credenciales del seed.

**Preconditions:**
- Backend `:3000` con seed aplicado

### Flow Steps:
1. Navegar a `/login`
2. Completar `admin@jasrapo.com` / `Admin123#`
3. Enviar formulario

### Expected Result:
- Redirige a `/app/dashboard`

---

## Test Case: `LOGIN-E2E-003` - Login con credenciales inválidas

**Priority:** `critical`

**Tags:**
- type → @e2e
- feature → @login

**Description/Objective:** Verificar manejo de error de autenticación.

### Flow Steps:
1. Navegar a `/login`
2. Ingresar contraseña incorrecta

### Expected Result:
- Alerta de error visible, sin redirección