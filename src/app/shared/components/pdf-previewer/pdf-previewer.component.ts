import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pdf-previewer',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  template: `
    <div class="pdf-container">
      @if (base64Src) {
        <ngx-extended-pdf-viewer
          [base64Src]="base64Src"
          [height]="height"
          [textLayer]="true"
          [showHandToolButton]="true"
        ></ngx-extended-pdf-viewer>
      }
      @if (src && !base64Src) {
        <ngx-extended-pdf-viewer
          [src]="src"
          [height]="height"
          [textLayer]="true"
          [showHandToolButton]="true"
        ></ngx-extended-pdf-viewer>
      }
    </div>
    @if (!src && !base64Src) {
      <div class="alert alert-info">Esperando documento para previsualización...</div>
    }
  `,
  styles: [
    `
      .pdf-container {
        width: 100%;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        overflow: hidden;
      }
    `,
  ],
})
export class PdfPreviewerComponent implements OnChanges {
  @Input() src?: Blob | string | Uint8Array;
  @Input() base64Src?: string;
  @Input() height = '700px';

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['src'] && this.src) || (changes['base64Src'] && this.base64Src)) {
      console.log('PDF source updated');
    }
  }
}
