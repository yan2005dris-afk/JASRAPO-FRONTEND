import { Injectable, signal, TemplateRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SpinnerService {
  // Cambiamos 'any' por 'unknown' para que el linter esté feliz y el código sea más seguro
  private readonly customLoading = signal<TemplateRef<unknown> | null>(null);
  private readonly loading = signal(false);
  private readonly activeRequests = signal(0);

  // Exponemos como Readonly para seguir las buenas prácticas de Signals
  readonly customSpinner = this.customLoading.asReadonly();
  readonly spinner = this.loading.asReadonly();

  private loadingStartTime = 0;
  private readonly minDurationMs = 800;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Activa el spinner global o uno personalizado
   */
  loadingOn(customLoader?: TemplateRef<unknown>): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (customLoader) {
      this.customLoading.set(customLoader);
    }

    this.activeRequests.update((count) => {
      if (count === 0) {
        this.loadingStartTime = Date.now();
        this.loading.set(true);
      }
      return count + 1;
    });
  }

  /**
   * Desactiva el spinner y limpia el template personalizado
   */
  loadingOff(): void {
    this.activeRequests.update((count) => {
      const newCount = Math.max(0, count - 1);
      if (newCount === 0) {
        const elapsed = Date.now() - this.loadingStartTime;
        const remaining = this.minDurationMs - elapsed;

        if (remaining > 0) {
          this.timeoutId = setTimeout(() => {
            this.loading.set(false);
            this.customLoading.set(null);
          }, remaining);
        } else {
          this.loading.set(false);
          this.customLoading.set(null);
        }
      }
      return newCount;
    });
  }
}
