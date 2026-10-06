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
Feature: pantalla de login
  Como persona usuaria del sistema
  Quiero autenticame en /login
  Para acceder al dashboard y a las funcionalidades autenticadas

  @login
  # LOGIN-E2E-001
  Scenario: Mostrar la pantalla de login y sus campos
    When navego a "/login"
    Then debería ver el campo "Usuario"
    And debería ver el campo "contraseña"
    And debería ver el botón "Iniciar Sesión"

  @login
  # LOGIN-E2E-002
  Scenario: Login exitoso con admin redirige al dashboard
    When navego a "/login"
    And ingreso "admin@jasrapo.com" en el campo "Usuario"
    And ingreso "Admin123#" en el campo "contraseña"
    And hago clic en "Iniciar Sesión"
    Then debería estar autenticado
    And la URL debería ser "/app/dashboard"

  @login
  # LOGIN-E2E-003
  Scenario: Login con credenciales inválidas muestra error y no redirige
    When navego a "/login"
    And ingreso "admin@jasrapo.com" en el campo "Usuario"
    And ingreso "ContraseñaIncorrecta123" en el campo "contraseña"
    And hago clic en "Iniciar Sesión"
    Then debería ver un mensaje de error de autenticación
    And la URL debería contener "/login"