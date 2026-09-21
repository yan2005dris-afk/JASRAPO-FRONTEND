import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxExtendedPdfViewerService } from 'ngx-extended-pdf-viewer';
import { vi } from 'vitest';

import { ReportPdfModalComponent } from './report-pdf-modal.component';

describe('ReportPdfModalComponent', () => {
  let fixture: ComponentFixture<ReportPdfModalComponent>;
  let component: ReportPdfModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportPdfModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportPdfModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Documento de prueba');
  });

  it('downloads the blob using the provided file name', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    fixture.componentRef.setInput('pdfBlob', blob);
    fixture.componentRef.setInput('fileName', 'reporte-morosidad.pdf');

    const createObjectURL = vi.fn(() => 'blob:modal');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    component.descargar();

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:modal');

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('prints through the embedded viewer service', () => {
    const printSpy = vi
      .spyOn(NgxExtendedPdfViewerService.prototype, 'print')
      .mockImplementation(() => undefined);

    component.imprimir();

    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });

  it('emits closed when requested', () => {
    let closed = false;
    component.closed.subscribe(() => (closed = true));
    component.requestClose();
    expect(closed).toBe(true);
  });
});
