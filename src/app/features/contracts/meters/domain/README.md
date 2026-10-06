# domain/

Reglas de negocio del feature. **Funciones puras + tipos**. Sin DI.

Reglas:

- Cero `@Injectable()`. Cero `inject()`. Cero `HttpClient`.
- Cero `console.log` con strings hardcoded para mensajes al usuario
  (esos viven en `application/`).
- Archivos organizados por sub-carpeta según su rol:
  - `models/` — tipos del dominio (interfaces, type aliases)
  - `constants/` — constantes tipadas (`Record<UnionType, string>`, etc.)
  - `rules/` — funciones puras que encapsulan lógica de negocio
  - `validators/` — funciones puras de validación
  - `events/` — discriminated unions (futuro)
- Si una "regla" necesita acceder al DOM, HTTP, toasts, etc., **no es
  domain** — es `application/` o `presentation/`.

Ejemplo:

```ts
// domain/rules/meter-status.rules.ts
export function canTransitionTo(
  current: MeterStatusCode,
  next: MeterStatusCode,
): boolean {
  // ...puro
}
```