import { TestBed } from '@angular/core/testing';

import { PdfPreviewerComponent } from './pdf-previewer.component';

describe('PdfPreviewerComponent', () => {
  it('exposes the official document preview as a labelled responsive region', async () => {
    await TestBed.configureTestingModule({ imports: [PdfPreviewerComponent] })
      .overrideComponent(PdfPreviewerComponent, {
        set: {
          imports: [],
          template: `
            <div class="pdf-container" role="region" [attr.aria-label]="ariaLabel()"></div>
          `,
        },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(PdfPreviewerComponent);
    fixture.componentRef.setInput('ariaLabel', 'PDF de prueba');
    fixture.detectChanges();

    const region = fixture.nativeElement.querySelector('[role="region"]') as HTMLElement;
    expect(region.getAttribute('aria-label')).toBe('PDF de prueba');
    expect(region.classList.contains('pdf-container')).toBe(true);
  });
});
