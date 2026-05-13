import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pdf-previewer',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  template: `
    <div class="pdf-container" *ngIf="src">
      <ngx-extended-pdf-viewer
        [src]="src"
        [height]="height"
        [textLayer]="true"
        [showHandToolButton]="true"
      ></ngx-extended-pdf-viewer>
    </div>
    <div *ngIf="!src" class="alert alert-info">
      Esperando documento para previsualización...
    </div>
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
  @Input() height: string = '700px';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src'] && this.src) {
      console.log('PDF source updated');
    }
  }
}
