import { Injectable, signal, TemplateRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SpinnerService {
  // Cambiamos 'any' por 'unknown' para que el linter esté feliz y el código sea más seguro
  private readonly customLoading = signal<TemplateRef<unknown> | null>(null);
  private readonly loading = signal(false);

  // Exponemos como Readonly para seguir las buenas prácticas de Signals
  readonly customSpinner = this.customLoading.asReadonly();
  readonly spinner = this.loading.asReadonly();

  /**
   * Activa el spinner global o uno personalizado
   */
  loadingOn(customLoader?: TemplateRef<unknown>): void {
    this.customLoading.set(customLoader ?? null);
    this.loading.set(true);
  }

  /**
   * Desactiva el spinner y limpia el template personalizado
   */
  loadingOff(): void {
    this.customLoading.set(null);
    this.loading.set(false);
  }
}
