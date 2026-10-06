# Guía de Migración y Arquitectura para el Módulo `billing/` (Temporal)

Esta guía documenta el patrón de arquitectura limpia (Clean Architecture) detectado en el módulo `@src/app/features/contracts` y establece cómo debe aplicarse al módulo de facturación (`@src/app/features/billing`).

## Patrón de Documentación y Arquitectura (Basado en `contracts/`)

El módulo de `contracts/` utiliza un enfoque de documentación jerárquico integrado en el código, que sirve simultáneamente como documentación viva y como guardián de la arquitectura:

1. **README Raíz (`contracts/README.md`)**:
   - Define el dominio general del módulo.
   - Lista todas las sub-features.
   - Mantiene una tabla de "Estado de migración" indicando qué sub-features han sido migradas al nuevo layout.
   - Establece el layout objetivo (`data/`, `domain/`, `application/`, `components/`, `pages/`).
   - Define las reglas globales por capa y convenciones de nombres (ej. interfaces con `I`, sufijos por rol como `.api`, `.actions`).
   - Explica paso a paso cómo crear o migrar un sub-feature.

2. **READMEs por Capa (dentro de cada sub-feature)**:
   Cada sub-feature (como `clients/` o `meters/`) contiene subcarpetas para las distintas capas, y dentro de estas, un archivo `README.md` que impone restricciones estrictas y muestra un ejemplo:
   - **`data/README.md`**: Restringe la capa a llamadas HTTP (`.api.ts`). Prohíbe lógica de negocio, mutación de estado y dependencias de UI (Toasts, Dialogs).
   - **`domain/README.md`**: Define reglas para funciones puras y tipos (models, constants, rules, validators). Prohíbe inyección de dependencias (`inject()`), `HttpClient` e interacciones de UI.
   - **`application/README.md`**: Define orquestadores/casos de uso (`.actions.ts`, `.transitions.ts`). Encargados de coordinar `data/`, `domain/` y side-effects (modales, navegación). Prohíbe alojar el estado global de la vista.

## Aplicando el Patrón a `billing/`

El módulo `billing/` contiene actualmente las siguientes sub-features:
- `batches/`
- `cash-sessions/`
- `credit-debit-notes/`
- `discounts/`
- `electronic-billing/`
- `payments/`
- `pre-invoices/`
- `rubros/`

### Plan de Acción para Billing

Para alinear `billing/` con la arquitectura y documentación de `contracts/`, se deben seguir los siguientes pasos:

1. **Crear el README Raíz (`billing/README.md`)**:
   - Redactar un documento similar a `contracts/README.md` detallando todas las sub-features de `billing/`.
   - Incluir la tabla de estado de migración, marcando a todos como `⏳ pending`.
   - Especificar el layout objetivo (`data/`, `domain/`, `application/`, etc.) y las reglas por capa.

2. **Scaffold por Sub-feature**:
   - Al iniciar la migración de un sub-feature (por ejemplo, `pre-invoices/`), crear las carpetas correspondientes: `data/`, `domain/`, `application/`, `components/`, `pages/`.
   - Copiar los `README.md` base para `data/`, `domain/` y `application/` desde `contracts/` (por ejemplo, de `contracts/clients/`) hacia las nuevas carpetas en el sub-feature de `billing/` en el que se esté trabajando.

3. **Migración del Código (Refactor gradual)**:
   - **Paso 1**: Extraer tipos de negocio, constantes, validadores puros y funciones a `domain/` (dentro de `models/`, `constants/`, `rules/`, `validators/`). Configurar `domain/index.ts` como un barrel para exportarlos.
   - **Paso 2**: Mover las llamadas HTTP a servicios terminados en `.api.ts` dentro de la carpeta `data/`. Quitarles toda lógica de negocio y dependencias de UI.
   - **Paso 3**: Crear las clases `.actions.ts` en `application/` para manejar los casos de uso, side effects (toasts, dialogs) y coordinación entre el dominio y el acceso a datos.
   - **Paso 4**: Mover los componentes principales (legacy) a la carpeta `pages/` (ej. `pages/pre-invoices-list/`) y los componentes de interfaz reutilizables a `components/`.

**Nota**: Este documento es temporal y deberá eliminarse una vez que se genere el archivo `billing/README.md` oficial y la migración comience a consolidarse.
