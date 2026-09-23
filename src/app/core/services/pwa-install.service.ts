import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({
  providedIn: 'root',
})
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly installAvailable = signal(false);

  /** Indica si el navegador ofreció la instalación de la PWA */
  readonly canInstall = this.installAvailable.asReadonly();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.onAppInstalled);
  }

  private readonly onBeforeInstallPrompt = (event: Event): void => {
    event.preventDefault();
    this.deferredPrompt = event as BeforeInstallPromptEvent;
    this.installAvailable.set(true);
  };

  private readonly onAppInstalled = (): void => {
    this.deferredPrompt = null;
    this.installAvailable.set(false);
  };

  /** Muestra el prompt de instalación; resuelve true si el usuario aceptó */
  async promptInstall(): Promise<boolean> {
    const promptEvent = this.deferredPrompt;
    if (!promptEvent) {
      return false;
    }

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      return choice.outcome === 'accepted';
    } catch {
      return false;
    } finally {
      this.deferredPrompt = null;
      this.installAvailable.set(false);
    }
  }
}
