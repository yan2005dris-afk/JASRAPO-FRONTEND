import { Injectable, signal, TemplateRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SpinnerService {
  private customLoading = signal<TemplateRef<any> | null>(null);
  private loading = signal(false);
  customSpinner = this.customLoading.asReadonly();
  spinner = this.loading.asReadonly();

  loadingOn(customLoader?: TemplateRef<any>) {
    this.customLoading.set(customLoader ?? null);
    this.loading.set(true);
  }

  loadingOff() {
    this.customLoading.set(null);
    this.loading.set(false);
  }
}
