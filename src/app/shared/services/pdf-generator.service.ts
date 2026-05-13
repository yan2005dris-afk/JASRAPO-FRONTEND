import { Injectable } from '@angular/core';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

// Configuración de fuentes para pdfMake
const pdfMakeInstance: any = pdfMake;
const pdfFontsInstance: any = pdfFonts;
if (pdfMakeInstance) {
  pdfMakeInstance.vfs = pdfFontsInstance.pdfMake ? pdfFontsInstance.pdfMake.vfs : pdfFontsInstance.vfs;
}

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  /**
   * Genera un PDF a partir de una definición y lo retorna como Blob.
   * @param documentDefinition Definición del documento de pdfMake
   */
  generatePdfBlob(documentDefinition: TDocumentDefinitions): Promise<Blob> {
    return new Promise((resolve) => {
      const pdfDocGenerator = pdfMake.createPdf(documentDefinition);
      (pdfDocGenerator as any).getBlob((blob: Blob) => {
        resolve(blob);
      });
    });
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
