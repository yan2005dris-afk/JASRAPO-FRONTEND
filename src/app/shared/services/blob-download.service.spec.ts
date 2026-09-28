import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlobDownloadService } from './blob-download.service';

describe('BlobDownloadService', () => {
  let service: BlobDownloadService;
  let createObjectURL: ReturnType<typeof vi.spyOn>;
  let revokeObjectURL: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let originalCreateElement: typeof document.createElement;
  let lastAnchor: HTMLAnchorElement | undefined;

  beforeEach(() => {
    lastAnchor = undefined;
    clickSpy = vi.fn();

    createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    originalCreateElement = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { configurable: true, value: clickSpy });
        lastAnchor = el as HTMLAnchorElement;
      }
      return el;
    }) as typeof document.createElement;

    service = new BlobDownloadService();
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    vi.restoreAllMocks();
  });

  it('creates an object URL, configures an anchor, clicks it and revokes the URL', () => {
    const blob = new Blob(['hello'], { type: 'application/pdf' });

    service.download(blob, 'test.pdf');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(lastAnchor?.href).toBe('blob:fake-url');
    expect(lastAnchor?.download).toBe('test.pdf');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});
