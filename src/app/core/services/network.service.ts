import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  private readonly platformId = inject(PLATFORM_ID);

  // Signal privado que almacena el estado de red actual
  private readonly isOnlineSignal = signal<boolean>(this.getInitialOnlineStatus());

  // Computed público para exponer el estado de red reactivamente
  readonly isOnline = computed(() => this.isOnlineSignal());

  // Subject para emitir eventos cuando la red se reconecta (online)
  private readonly connectedSubject = new Subject<void>();
  readonly connected$: Observable<void> = this.connectedSubject.asObservable();

  constructor() {
    this.initNetworkListeners();
  }

  private getInitialOnlineStatus(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return navigator.onLine;
    }
    return true; // En SSR asumimos online
  }

  private initNetworkListeners(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('online', () => {
        this.isOnlineSignal.set(true);
        this.connectedSubject.next();
      });

      window.addEventListener('offline', () => {
        this.isOnlineSignal.set(false);
      });
    }
  }
}
