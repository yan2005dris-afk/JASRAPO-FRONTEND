# data/

Capa de acceso a datos del feature. **HTTP puro**: un método = un endpoint.

Reglas:

- Archivos terminados en `.api.ts` (no `.service.ts`) para hacer evidente
  que NO hay lógica de negocio.
- Cada método devuelve `Observable<T>` o `Promise<T>` y nada más.
- Cero `inject()` de `ToastService`, `ConfirmDialogService`, etc.
- Cero mutación de estado (no signals, no propiedades).
- Si necesitás mappear DTO a un tipo de dominio, hacelo en este folder
  o en `domain/`, no en el componente.
- Si exportás un `type` o `interface` desde acá, **es un leak de
  domain** — movelo a `domain/models/` antes de commitear.

Ejemplo:

```ts
@Injectable({ providedIn: 'root' })
export class PaymentAgreementsApi {
  private readonly http = inject(HttpClient);

  getAgreements(params?: IFindAllAgreementsParams): Observable<IPaginatedResult<IAgreement>> {
    return this.http.get<IPaginatedResult<IAgreement>>(`${this.baseUrl}/agreements`, {
      params: buildHttpParams(params),
    });
  }
}
```