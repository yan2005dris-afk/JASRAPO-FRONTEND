import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlobDownloadService } from './blob-download.service';

describe('BlobDownloadService', () => {
  let service: BlobDownloadService;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let originalCreateElement: typeof document.createElement;
  let lastAnchor: HTMLAnchorElement;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:fake-url');
    revokeObjectURL = vi.fn();
    clickSpy = vi.fn();

    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    originalCreateElement = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { configurable: true, value: clickSpy });
        lastAnchor = el;
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
    expect(lastAnchor.href).toBe('blob:fake-url');
    expect(lastAnchor.download).toBe('test.pdf');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});