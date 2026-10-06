/** Photos are normalized before both direct upload and IndexedDB enqueue. */
export class OperatorEvidencePhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperatorEvidencePhotoError';
  }
}

const MAX_EDGE = 2048;
const JPEG_QUALITIES = [0.82, 0.65, 0.45] as const;

async function decodePhoto(blob: Blob): Promise<{
  width: number;
  height: number;
  source: CanvasImageSource;
  close: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      };
    } catch {
      // Safari may support a camera format through <img> but not createImageBitmap.
    }
  }

  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      source: image,
      close: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new OperatorEvidencePhotoError(
      'No se pudo abrir la foto. Elegí una imagen compatible o cambiá la cámara a JPEG.',
    );
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob?.type === 'image/jpeg'
          ? resolve(blob)
          : reject(new OperatorEvidencePhotoError('No se pudo convertir la foto a JPEG.')),
      'image/jpeg',
      quality,
    );
  });
}

/** HEIC, oversized camera files and 48 MP photos cannot be sent raw to S3. */
export async function prepareOperatorEvidencePhoto(
  blob: Blob | null | undefined,
  maxBytes: number,
): Promise<Blob | null> {
  if (!blob) return null;
  if (blob.size === 0) throw new OperatorEvidencePhotoError('La foto está vacía. Tomá otra foto.');

  const image = await decodePhoto(blob);
  try {
    if (!image.width || !image.height) {
      throw new OperatorEvidencePhotoError('La foto no tiene dimensiones válidas.');
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      throw new OperatorEvidencePhotoError('No se pudo preparar la foto en este dispositivo.');
    }
    context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
    for (const quality of JPEG_QUALITIES) {
      const jpeg = await toJpeg(canvas, quality);
      if (jpeg.size <= maxBytes) return jpeg;
    }
    throw new OperatorEvidencePhotoError(
      'La foto sigue siendo demasiado grande. Elegí otra imagen.',
    );
  } finally {
    image.close();
  }
}
