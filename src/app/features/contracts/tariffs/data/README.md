# data/

Capa de acceso a datos del feature. **HTTP puro**: un método = un endpoint.

Reglas:

- Archivos terminados en `.api.ts` (no `.service.ts`) para hacer evidente
  que NO hay lógica de negocio.
- Cada método devuelve `Observable<T>` o `Promise<T>` y nada más.
- Cero `inject()` de `ToastService`, `ConfirmDialogService`, etc.
- Cero mutación de estado (no signals, no propiedades).
- Si necesitás mappear DTO a un tipo de dominio, hacelo en `domain/rules/`
  o `domain/models/`, no en este folder.
- Si exportás un `type` o `interface` desde acá, **es un leak de
  domain** — movelo a `domain/models/` antes de commitear.

Ejemplo:

```ts
@Injectable({ providedIn: 'root' })
export class TariffsApi {
  private readonly http = inject(HttpClient);

  getTariffs(params?: ITariffQueryParams): Observable<ITariffResponse> {
    return this.http.get<ITariffResponse>(`${this.baseUrl}/tariffs`, {
      params: buildHttpParams(params),
    });
  }
}
```