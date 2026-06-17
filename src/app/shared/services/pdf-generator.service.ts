import { Injectable } from '@angular/core';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const pdfMake: any = require('pdfmake/build/pdfmake');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const pdfFonts: any = require('pdfmake/build/vfs_fonts');

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs || pdfFonts;

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  /**
   * Genera un PDF a partir de una definición y lo retorna como Blob.
   * @param documentDefinition Definición del documento de pdfMake
   */
  async generatePdfBlob(documentDefinition: TDocumentDefinitions): Promise<Blob> {
    const pdfDocGenerator = pdfMake.createPdf(documentDefinition);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (pdfDocGenerator as any).getBlob();
  }

  async generatePdfBase64(documentDefinition: TDocumentDefinitions): Promise<string> {
    const pdfDocGenerator = pdfMake.createPdf(documentDefinition);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (pdfDocGenerator as any).getBase64();
  }

  async getPdfDataUrl(documentDefinition: TDocumentDefinitions): Promise<string> {
    const pdfDocGenerator = pdfMake.createPdf(documentDefinition);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (pdfDocGenerator as any).getDataUrl();
  }

  /**
   * Abre el PDF generado en una nueva ventana.
   */
  openPdf(documentDefinition: TDocumentDefinitions): void {
    pdfMake.createPdf(documentDefinition).open();
  }

  /**
   * Descarga el PDF generado.
   */
  downloadPdf(documentDefinition: TDocumentDefinitions, fileName: string): void {
    pdfMake.createPdf(documentDefinition).download(fileName);
  }
}
