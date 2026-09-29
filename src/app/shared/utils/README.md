# shared/utils/

Funciones puras cross-feature. **Sin DI, sin signals, sin estado.**

Reglas:

- Solo funciones puras + tipos.
- Un archivo por dominio de utilidad (`operator-name.ts`, `http-params.ts`, etc.).
- Cero imports de `@angular/*` salvo tipos básicos (`HttpParams` está OK porque es solo el tipo).
- Si una función necesita `inject()` o accede a servicios, **no va acá** — va en `infrastructure/` o en el feature.
- Cada función tiene su spec en el mismo folder (`*.spec.ts`).