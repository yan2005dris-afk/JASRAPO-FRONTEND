import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OperatorEvidencePhotoError,
  prepareOperatorEvidencePhoto,
} from './operator-evidence-photo';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('prepareOperatorEvidencePhoto', () => {
  it('redimensiona una foto HEIC de 48 MP y la convierte a JPEG', async () => {
    const close = vi.fn();
    const drawImage = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 8000, height: 6000, close }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });

    const result = await prepareOperatorEvidencePhoto(
      new Blob(['heic'], { type: 'image/heic' }),
      5 * 1024 * 1024,
    );

    expect(result?.type).toBe('image/jpeg');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1536);
    expect(close).toHaveBeenCalledOnce();
  });

  it('reduce la calidad cuando el primer JPEG excede el límite', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const qualities: number[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback, _type, quality) => {
        qualities.push(quality ?? 0);
        callback(new Blob([qualities.length === 1 ? 'too big' : 'ok'], { type: 'image/jpeg' }));
      },
    );

    const result = await prepareOperatorEvidencePhoto(new Blob(['source']), 4);

    expect(result?.size).toBe(2);
    expect(qualities).toEqual([0.82, 0.65]);
  });

  it('rechaza una foto vacía sin decodificarla', async () => {
    const decoder = vi.fn();
    vi.stubGlobal('createImageBitmap', decoder);

    await expect(prepareOperatorEvidencePhoto(new Blob([]), 100)).rejects.toBeInstanceOf(
      OperatorEvidencePhotoError,
    );
    expect(decoder).not.toHaveBeenCalled();
  });
});
