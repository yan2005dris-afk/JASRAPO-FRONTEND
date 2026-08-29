import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-pdf-previewer',
  imports: [NgxExtendedPdfViewerModule],
  templateUrl: './pdf-previewer.component.html',
  styleUrl: './pdf-previewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPreviewerComponent {
  readonly src = input<Blob | string | Uint8Array | undefined>(undefined);
  readonly base64Src = input<string | undefined>(undefined);
  readonly height = input('700px');
  readonly ariaLabel = input('Vista previa del documento PDF oficial');
}
