import { Injectable } from '@angular/core';

/**
 * Generic browser-side download for an in-memory `Blob`.
 *
 * Used by any flow that receives a binary payload from the backend (PDFs,
 * CSVs, XLSX, ZIPs, etc.) and wants the user to save it without round-
 * tripping through the server.
 *
 * The implementation creates an object URL, triggers an anchor click in the
 * current document, and revokes the URL synchronously after the click. The
 * anchor element is kept in memory only for the duration of the click —
 * garbage-collected as soon as the function returns.
 *
 * Lives outside any feature module so it can be reused. Multiple call sites
 * in the codebase were duplicating this exact pattern before this service
 * existed; consolidating here makes them testable and consistent.
 */
@Injectable({ providedIn: 'root' })
export class BlobDownloadService {
  /**
   * Triggers a browser download for the given blob.
   *
   * @param blob the binary payload from the backend
   * @param filename the name suggested to the user (the browser may sanitize it)
   */
  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}