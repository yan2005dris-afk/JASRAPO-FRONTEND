# domain/

Reglas de negocio del feature. **Funciones puras + tipos**. Sin DI.

Reglas:

- Cero `@Injectable()`. Cero `inject()`. Cero `HttpClient`.
- Cero `console.log` con strings hardcoded para mensajes al usuario
  (esos viven en `application/`).
- Archivos organizados por sub-carpeta según su rol:
  - `models/` — tipos del dominio (interfaces, type aliases, payload DTOs)
  - `constants/` — constantes tipadas (`Record<UnionType, string>`, etc.)
  - `rules/` — funciones puras que encapsulan lógica de negocio
    (incluye mappers DTO→dominio, ya que esos son lógica pura sin DI)
  - `validators/` — funciones puras de validación

Los **payload DTOs** (`ICreateReadingAnomalyDto`,
`IUpdateReadingAnomalyDto`, `IReadingAnomalyFilterParams`) y los
**shapes de respuesta** también viven acá. Son tipos de dominio
(qué datos envía/recibe el cliente del backend), no detalles de HTTP.

Ejemplo:

```ts
// domain/rules/reading-anomaly.mapper.ts
export function mapNoveltyToAnomaly(item: IWorkOrderNoveltyRaw): IReadingAnomaly {
  // ...pure function that maps wire shape -> domain shape
}
```