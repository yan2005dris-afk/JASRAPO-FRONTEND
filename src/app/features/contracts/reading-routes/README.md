# Feature: `reading-routes`

Gestión de rutas de trabajo (planificación, asignación por periodo, seguimiento y
detalle de hojas de ruta para operarios de campo).

## Estructura

```
reading-routes/
├── data/                          # HTTP fino (Observable/Promise por método)
│   └── reading-routes.api.ts
├── domain/                        # Reglas de negocio puras + tipos
│   ├── models/                    # tipos del dominio (interfaces + type aliases)
│   ├── constants/                 # constantes tipadas
│   ├── rules/                     # funciones puras (kpi-normalize, coverage, assignment)
│   └── validators/                # validadores puros (period, assignments)
├── application/                   # Orquestadores de use cases (signals + toasts + dialogs)
│   ├── route-order.actions.ts
│   ├── route-reading.actions.ts
│   └── route-status.transitions.ts
├── components/                    # UI reusable del feature
│   ├── reassign-route-modal/
│   └── route-contracts-table/
├── pages/                         # Rutas/pantallas del feature
│   ├── reading-routes-list/       # listado con filtros + acciones + export
│   ├── reading-route-detail/      # detalle de una ruta
│   └── route-assignment-workspace/ # workspace de asignación por periodo
└── interfaces/                    # @deprecated — usar domain/models
```

## Reglas por capa

| Capa              | Responsabilidad                                           | Restricciones                                            |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| `data/`           | Acceso a datos. Un método = un endpoint.                  | Cero estado. Cero toasts/dialogs. Cero mapeos a dominio. |
| `domain/models`   | Tipos e interfaces del dominio (DTOs, enums, unions).      | Solo tipos. Sin DI, sin imports de Angular.              |
| `domain/constants`| Constantes tipadas (`Record<Union, string>`).             | Solo constantes.                                         |
| `domain/rules`    | Funciones puras que encapsulan reglas de negocio.         | Sin DI. Sin `inject()`. Sin `HttpClient`.                |
| `domain/validators`| Validadores puros (devuelven `Result<T, E>`).             | Sin DI.                                                  |
| `application/`    | Orquesta `data/` + `domain/` + efectos (toasts, dialogs). | Una clase por use case. Recibe deps por parámetro.       |
| `components/`     | UI reusable del feature (sin estado de página).           | Stateless o con estado local mínimo.                     |
| `pages/`          | Componentes top-level (lazy). Dueños del state de página.  | Una página = una ruta.                                   |

## Cómo añadir código nuevo

### Nuevo endpoint

1. Agregar método en `data/reading-routes.api.ts` (HTTP puro).
2. Si el método requiere UI feedback o compone múltiples llamadas, crear un
   orquestador en `application/X.actions.ts` o `X.transitions.ts`.
3. Consumir desde la `page/` correspondiente.

### Nueva regla de negocio

1. Crear función pura en `domain/rules/<nombre>.rules.ts`.
2. Si es solo lógica sin tipos nuevos, agregar spec en el mismo path.
3. Importar desde `application/` o desde la `page/` que la necesite.

### Nuevo tipo / DTO

1. Agregar el tipo en `domain/models/reading-route.model.ts` (o archivo
   dedicado si el set es grande).
2. **Nunca** importar `domain/models` desde `data/` (los DTOs del backend se
   mantienen en `data/` y se mapean en `domain/` si hace falta normalización).

### Nueva página

1. Crear carpeta en `pages/<name>/` con `*.component.{ts,html,scss}` + spec.
2. Registrar la ruta en `src/app/app.routes.ts` con `loadComponent`.

## Convenciones del feature

- **Prefijo `I`** en interfaces (`IReadingRoute`, `IFilterReadingsParams`) —
  consistente con el resto del codebase.
- **Sufijo por rol de archivo**: `.api` (data), `.actions` (application),
  `.transitions` (application), `.rules` (domain/rules), `.validator` (domain/validators),
  `.constants` (domain/constants), `.model` (domain/models), `.component` (componentes/páginas).
- **Tests**: cada archivo de código tiene su spec adyacente (`X.spec.ts`).
- **Cambios de comportamiento**: abrir issue + PR con tests. Los commits
  `refactor(routes):` son solo movimiento + actualización de imports.