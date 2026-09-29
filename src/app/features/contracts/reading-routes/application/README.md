# application/

Use cases / orquestadores. Coordinan `data/` + `domain/` + efectos (toasts, dialogs).

Reglas:

- Un archivo por use case / orquestador. **No** una clase gorda "Service".
- Reciben todas las dependencias por parámetro (no `@Injectable()` global
  salvo casos donde el costo de pasar deps justifique).
- Pueden usar signals internamente para coordinar estado de UI entre
  múltiples acciones, pero **no** son el state holder de la página
  (eso lo hace el componente).
- Disparan toasts, navegan, abren modales. No llevan lógica de UI.

Ejemplo:

```ts
@Injectable()
export class RouteOrderActions {
  start(orden: OrderWork, processingId: WritableSignal<string | null>): void {
    if (!assertPeriodOpen(...)) return;
    this.api.updateOrdenEstado(...).subscribe({
      next: () => {
        processingId.set(null);
        this.toast.success('...');
      },
    });
  }
}
```