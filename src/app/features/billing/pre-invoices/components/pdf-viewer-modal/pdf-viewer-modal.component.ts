import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfPreviewerComponent } from '../../../../../shared/components/pdf-previewer/pdf-previewer.component';
import { IPreInvoice } from '../../interfaces/ipre-invoice.interface';

@Component({
  selector: 'app-pdf-viewer-modal',
  standalone: true,
  imports: [CommonModule, PdfPreviewerComponent],
  templateUrl: './pdf-viewer-modal.component.html',
  styleUrl: './pdf-viewer-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfViewerModalComponent {
  readonly preInvoice = input.required<IPreInvoice>();
  readonly pdfBlob = input<Blob | null>(null);
  readonly closed = output<void>();

  download(): void {
    const blob = this.pdfBlob();
    if (!blob) return;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prefactura-${this.preInvoice().prefacturaId}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  close(): void {
    this.closed.emit();
  }
}
