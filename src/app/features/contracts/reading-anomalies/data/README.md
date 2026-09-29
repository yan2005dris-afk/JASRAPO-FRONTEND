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
- Si tenés un método privado de **mapeo DTO→dominio** (no HTTP),
  movelo a `domain/rules/` — un mapper es lógica de dominio pura,
  no detalle de HTTP.

Ejemplo:

```ts
@Injectable({ providedIn: 'root' })
export class ReadingAnomaliesApi {
  private readonly http = inject(HttpClient);

  getAnomalies(params?: IReadingAnomalyFilterParams): Observable<IPaginatedResult<IReadingAnomaly>> {
    return this.http
      .get<{ data: IWorkOrderNoveltyRaw[]; meta?: { totalItems: number } }>(
        `${this.baseUrl}/work-order-novelties`,
        { params: buildHttpParams(params) },
      )
      .pipe(map((res) => mapNoveltyToAnomalyList(res, params)));  // <-- mapper from domain/rules/
  }
}
```