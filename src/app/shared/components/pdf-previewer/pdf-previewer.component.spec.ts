import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { PdfPreviewerComponent } from './pdf-previewer.component';

@Component({
  // El selector debe coincidir con el componente externo que sustituye en esta prueba.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ngx-extended-pdf-viewer',
  template: '',
})
class PdfViewerStubComponent {
  readonly src = input<Blob | string | Uint8Array>();
  readonly base64Src = input<string>();
  readonly height = input<string>();
  readonly textLayer = input(false);
  readonly showHandToolButton = input(false);
}

describe('PdfPreviewerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PdfPreviewerComponent] })
      .overrideComponent(PdfPreviewerComponent, {
        set: { imports: [PdfViewerStubComponent] },
      })
      .compileComponents();
  });

  it('renders the production preview region with a neutral default label', () => {
    const fixture = TestBed.createComponent(PdfPreviewerComponent);
    fixture.componentRef.setInput('src', 'blob:report');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const region = root.querySelector<HTMLElement>('[role="region"]');
    const viewer = fixture.debugElement.query(By.directive(PdfViewerStubComponent));

    expect(region?.getAttribute('aria-label')).toBe('Vista previa del documento PDF');
    expect(region?.classList.contains('pdf-container')).toBe(true);
    expect(viewer.componentInstance.src()).toBe('blob:report');
  });

  it('renders the production empty state when no source is available', () => {
    const fixture = TestBed.createComponent(PdfPreviewerComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="region"]')).toBeNull();
    expect(root.querySelector('[role="status"]')?.textContent).toContain(
      'Esperando documento para previsualización',
    );
  });
});
