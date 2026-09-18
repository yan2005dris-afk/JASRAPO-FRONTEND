import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgxExtendedPdfViewerService } from 'ngx-extended-pdf-viewer';

import { PdfPreviewerComponent } from '../../../../shared/components/pdf-previewer/pdf-previewer.component';
import { IReportContextItem } from '../models/report-workspace.model';

/**
 * Modal reutilizable para previsualizar un PDF oficial (general o individual) con
 * opciones de imprimir y descargar. La impresión usa el visor embebido; la
 * descarga se resuelve desde el propio Blob.
 */
@Component({
  selector: 'app-report-pdf-modal',
  imports: [A11yModule, PdfPreviewerComponent],
  templateUrl: './report-pdf-modal.component.html',
  styleUrl: './report-pdf-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportPdfModalComponent {
  private readonly document = inject(DOCUMENT);
  private readonly pdfViewer = inject(NgxExtendedPdfViewerService);

  readonly title = input.required<string>();
  readonly description = input('');
  readonly pdfBlob = input<Blob | null>(null);
  readonly isLoading = input(false);
  readonly errorMessage = input('');
  readonly fileName = input('reporte.pdf');
  readonly contextItems = input<readonly IReportContextItem[]>([]);

  readonly closed = output<void>();
  readonly retry = output<void>();

  requestClose(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  imprimir(): void {
    // El visor imprime el documento actualmente cargado en la vista previa.
    this.pdfViewer.print();
  }

  descargar(): void {
    const blob = this.pdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = this.fileName();
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
