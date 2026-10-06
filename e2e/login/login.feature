# language: es
#
# Ejemplo de BDD para capacitación. Estos 3 escenarios son la versión Gherkin
# de los tests Playwright clásicos en `e2e/login/login.spec.ts` (mismos IDs
# LOGIN-E2E-00X). Los muchachos pueden comparar uno y otro para entender la
# diferencia entre "test con API de Playwright" y "test con lenguaje natural".
#
# Tags útiles:
#   @login     → agrupa toda la pantalla. `pnpm e2e:bdd --grep @login`
#   @critical  → marca escenarios prioritarios para el release train.

@critical
Característica: pantalla de login
  Como persona usuaria del sistema
  Quiero autenticarme en /login
  Para acceder al dashboard y a las funcionalidades autenticadas

  @login
  # LOGIN-E2E-001
  Escenario: Mostrar la pantalla de login y sus campos
    Cuando navego a "/login"
    Entonces debería ver el campo "Usuario"
    Y debería ver el campo "contraseña"
    Y debería ver el botón "Ingresar al Sistema"

  @login
  # LOGIN-E2E-002
  Escenario: Login exitoso con admin redirige al dashboard
    Dado que el backend mockea el endpoint de autenticación
    Cuando navego a "/login"
    E ingreso "admin@jasrapo.com" en el campo "Usuario"
    E ingreso "Admin123#" en el campo "contraseña"
    Y hago clic en "Ingresar al Sistema"
    Entonces debería estar autenticado
    Y la URL debería ser "/app/dashboard"

  @login
  # LOGIN-E2E-003
  Escenario: Login con credenciales inválidas muestra error y no redirige
    Dado que el backend mockea el endpoint de autenticación
    Cuando navego a "/login"
    E ingreso "admin@jasrapo.com" en el campo "Usuario"
    E ingreso "ContraseñaIncorrecta123" en el campo "contraseña"
    Y hago clic en "Ingresar al Sistema"
    Entonces debería ver un mensaje de error de autenticación
    Y la URL debería contener "/login"