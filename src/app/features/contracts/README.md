# Feature: `contracts/`

Gestión de la relación contractual con clientes: clientes, medidores,
servicios, contratos, lecturas con anomalías, acuerdos de pago y tarifas.

## Sub-features

```
contracts/
├── clients/               # gestión de clientes
├── meters/                # inventario + ciclo de vida de medidores
├── payment-agreements/    # acuerdos de pago parciales
├── reading-anomalies/     # reporte + resolución de anomalías de lectura
├── reading-routes/        # hojas de ruta de lectura        [MIGRADO — PR #153]
├── service-contracts/     # contratos de servicio instalados
└── tariffs/               # tarifas y conceptos facturables
```

## Estado de migración

| Sub-feature   | Layout                  | PR  | Estado      |
| ------------ | ----------------------- | --- | ----------- |
| `reading-routes` | data/domain/application | #153 | ✅ DONE    |
| `meters`         | legacy → data/domain   | —   | 🔄 WIP     |
| `clients`        | legacy                 | —   | ⏳ pending |
| `service-contracts` | legacy               | —   | ⏳ pending |
| `payment-agreements` | legacy             | —   | ⏳ pending |
| `tariffs`        | legacy                 | —   | ⏳ pending |
| `reading-anomalies` | legacy              | —   | ⏳ pending |

Orden de migración: el de mayor consumo externo primero
(`meters` → `clients` → `service-contracts` → resto), para blindar la
arquitectura antes de que se acumule más código acoplado.

## Layout objetivo por sub-feature

```
<sub-feature>/
├── data/                          # HTTP fino (.api.ts)
├── domain/                        # puro: tipos + reglas + constantes
│   ├── models/                    # interface + type unions
│   ├── constants/                 # Record<Union, string>, etc.
│   ├── rules/                     # funciones puras
│   └── validators/                # funciones puras
├── application/                   # orquestadores (.actions, .transitions)
├── components/                    # UI reusable del feature
└── pages/                         # pantallas (lazy)
```

## Reglas por capa

| Capa | Responsabilidad | Restricciones |
| ---- | --------------- | ------------- |
| `data/` | HTTP por método | Sin estado, sin toasts/dialogs, sin DI lógica |
| `domain/models` | Tipos del dominio | Solo types/interfaces. Sin imports de Angular |
| `domain/constants` | Constantes tipadas | `Record<Union, ...>` cuando aplique |
| `domain/rules` | Funciones puras | Sin DI, sin `inject()`, sin HttpClient |
| `domain/validators` | Validadores puros | Devuelven `{valid, reason}` (forma canónica) |
| `application/` | Orquesta data + domain + efectos | Una clase por use case |
| `components/` | UI reusable | Stateless o state local mínimo |
| `pages/` | Pantallas (lazy) | State de página + composición |

## Convenciones

- **Prefijo `I`** en interfaces (`IMeter`, `IReplaceMeterRequest`,
  `ICreateRouteAssignmentsDto`). Consistente con el resto del codebase.
- **Sufijo por rol de archivo**: `.api` (data), `.actions`/`transitions`
  (application), `.rules` (domain/rules), `.validator` (domain/validators),
  `.constants` (domain/constants), `.model` (domain/models), `.component`
  (componentes/páginas).
- **Barrels**: cada sub-feature expone `domain/index.ts` que re-exporta
  models, constants, rules y validators.
- **Imports**:
  - Internos al sub-feature: path específico al archivo (`../../domain/rules/x`).
  - Externos al sub-feature: usar el barrel (`../../reading-routes/domain`).

## Cómo añadir un nuevo sub-feature

1. Crear carpeta `<nombre>/` con esta estructura:
   ```
   <nombre>/
   ├── components/
   ├── data/
   ├── domain/
   ├── application/
   ├── interfaces/   ← punto de entrada inicial; deprecated después de migrar
   ├── pages/
   ├── services/     ← idem
   └── <nombre>.ts   ← componente legacy, se mueve a pages/ en la migración
   ```
2. Crear un único commit `docs(contracts): scaffold <nombre>/` con los
   READMEs de las subcarpetas + interfaz y service iniciales.
3. Migrar archivo por archivo siguiendo las Fases 2-3 del precedente
   `reading-routes` (ver `odd/tasks/reading-routes-clean-architecture.md`).

## Cómo migrar un sub-feature existente (orden recomendado)

1. `docs(contracts): scaffold data/, domain/, application/ in <sub>` —
   crear carpetas + READMEs vacíos.
2. `refactor(<sub>): move i<nombre>.interface to domain/models/<nombre>.model` —
   mover tipos + actualizar todos los imports (incluyendo consumers externos).
3. `refactor(<sub>): rename <nombre>.service to data/<nombre>.api` —
   split HTTP vs lógica si hace falta, mover archivo.
4. `refactor(<sub>): add domain barrel (models + index)` — barrels.
5. `chore(<sub>): apply prettier + validate` — format/lint/test/build.

## Lección aprendida (de la migración de `reading-routes`)

- Después de un movimiento con paths relativos, **correr `pnpm build`
  además de `pnpm test`**. Los componentes sin spec no se detectan con
  tests pero sí con el type-check estricto del build.
- Si un componente legacy está en la raíz del feature, moverlo a
  `pages/<nombre>-list/` (siguiendo la convención de los otros pages).
- Los validators con side effects (toast, navigate) son deuda técnica —
  la forma canónica es `Result<T, E>` discriminado, dejando el side effect
  al caller.

## Recursos

- `odd/tasks/contracts-clean-architecture.md` — task file de este refactor.
- `odd/tasks/reading-routes-clean-architecture.md` — precedente y detalle
  paso a paso.
- `src/app/features/contracts/reading-routes/README.md` — README del
  sub-feature ya migrado (referencia del layout final).