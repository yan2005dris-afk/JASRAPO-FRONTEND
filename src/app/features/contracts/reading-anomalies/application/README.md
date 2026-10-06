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
export class ReadingAnomalyActions {
  create(dto: ICreateReadingAnomalyDto, file: File, processing: WritableSignal<boolean>): void {
    this.api.createAnomaly(dto, file).subscribe({
      next: () => {
        processing.set(false);
        this.toast.success('Anomalía registrada');
      },
    });
  }
}
```