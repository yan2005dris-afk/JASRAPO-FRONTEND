import { TestBed } from '@angular/core/testing';
import { PwaInstallService } from './pwa-install.service';

interface InstallPromptMock extends Event {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function dispatchInstallPrompt(outcome: 'accepted' | 'dismissed'): InstallPromptMock {
  const event = new Event('beforeinstallprompt') as InstallPromptMock;
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  window.dispatchEvent(event);
  return event;
}

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PwaInstallService);
  });

  afterEach(() => {
    window.dispatchEvent(new Event('appinstalled'));
  });

  it('starts with canInstall false', () => {
    expect(service.canInstall()).toBe(false);
  });

  it('exposes canInstall true after beforeinstallprompt', async () => {
    dispatchInstallPrompt('accepted');
    expect(service.canInstall()).toBe(true);
  });

  it('resolves true when the user accepts the install prompt', async () => {
    const event = dispatchInstallPrompt('accepted');

    await expect(service.promptInstall()).resolves.toBe(true);
    expect(event.prompt).toHaveBeenCalled();
    expect(service.canInstall()).toBe(false);
  });

  it('resolves false when the user dismisses the install prompt', async () => {
    dispatchInstallPrompt('dismissed');

    await expect(service.promptInstall()).resolves.toBe(false);
    expect(service.canInstall()).toBe(false);
  });

  it('resolves false when no prompt is available', async () => {
    await expect(service.promptInstall()).resolves.toBe(false);
  });

  it('clears the prompt state on appinstalled', async () => {
    dispatchInstallPrompt('accepted');
    expect(service.canInstall()).toBe(true);

    window.dispatchEvent(new Event('appinstalled'));
    expect(service.canInstall()).toBe(false);
    await expect(service.promptInstall()).resolves.toBe(false);
  });
});
