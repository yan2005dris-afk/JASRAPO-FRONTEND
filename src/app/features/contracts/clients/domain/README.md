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
  - `validators/` — funciones puras de validación (incluye ValidatorFn de Angular Forms)
- Si una "regla" necesita acceder al DOM, HTTP, toasts, etc., **no es
  domain** — es `application/` o `presentation/`.

Nota sobre `validators/`: los archivos aquí pueden importar tipos de
`@angular/forms` (`AbstractControl`, `ValidationErrors`, `ValidatorFn`)
porque son solo tipos, no runtime. Lo que NO se permite aquí es
`@Injectable()` o `inject()`.

Ejemplo:

```ts
// domain/validators/identificacion.validator.ts
export class IdentificacionUtil {
  static esCedula(cedula: string): boolean {
    // ...algoritmo de dígito verificador
  }
}

export function identificacionValidator(codigo: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // ...puro
  };
}
```