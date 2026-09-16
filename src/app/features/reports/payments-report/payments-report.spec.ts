import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ClientsService } from '../../contracts/clients/services/clients.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ReportsService } from '../services/reports.service';
import { PaymentsReportComponent } from './payments-report';

describe('PaymentsReportComponent', () => {
  let fixture: ComponentFixture<PaymentsReportComponent>;
  let reportsService: {
    getPaymentsReport: ReturnType<typeof vi.fn>;
    getPaymentsReportPdf: ReturnType<typeof vi.fn>;
    sendPaymentsReportEmail: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    reportsService = {
      getPaymentsReport: vi.fn(() => of({ pagos: [] })),
      getPaymentsReportPdf: vi.fn(() => of(new Blob())),
      sendPaymentsReportEmail: vi.fn(() => of({})),
    };

    await TestBed.configureTestingModule({
      imports: [PaymentsReportComponent],
      providers: [
        { provide: ReportsService, useValue: reportsService },
        {
          provide: ClientsService,
          useValue: {
            searchClients: () => of({ data: [] }),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: vi.fn(),
            error: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsReportComponent);
    fixture.detectChanges();
  });

  it('clientPickerTrapsEscapeAndRestoresFocus', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    fixture.componentInstance.abrirBuscadorClientes();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.directive(CdkTrapFocus))).toBeTruthy();
    const searchInput = fixture.nativeElement.querySelector(
      '.picker-modal input[type="search"]',
    ) as HTMLInputElement;
    expect(searchInput.hasAttribute('cdkfocusinitial')).toBe(true);
    searchInput.focus();

    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(fixture.componentInstance.isClientPickerOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('restores the PDF view and loading announcement when retrying', () => {
    reportsService.getPaymentsReportPdf.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Falló el PDF' } })),
    );
    fixture.componentInstance.setView('pdf');

    expect(fixture.componentInstance.activeView()).toBe('table');
    expect(fixture.componentInstance.workspaceError()).toBe('Falló el PDF');

    const retryRequest = new Subject<Blob>();
    reportsService.getPaymentsReportPdf.mockReturnValueOnce(retryRequest);
    fixture.componentInstance.retryLastAction();

    expect(fixture.componentInstance.activeView()).toBe('pdf');
    expect(fixture.componentInstance.workspaceStatus()).toBe('loading');
    expect(fixture.componentInstance.workspaceStatusMessage()).toBe(
      'Generando el documento PDF oficial…',
    );

    const pdf = new Blob(['pdf'], { type: 'application/pdf' });
    retryRequest.next(pdf);
    retryRequest.complete();

    expect(fixture.componentInstance.pdfBlob()).toBe(pdf);
    expect(fixture.componentInstance.workspaceError()).toBe('');
  });

  it('invalidates results and ignores late responses after filters change', () => {
    const dataRequest = new Subject<unknown>();
    reportsService.getPaymentsReport.mockReturnValueOnce(dataRequest);
    fixture.componentInstance.consultar();
    fixture.componentInstance.actualizarFechaDesde('2026-09-01');

    dataRequest.next({ pagos: [{ factura: '001' }] });
    dataRequest.complete();

    expect(fixture.componentInstance.reportData()).toBeNull();
    expect(fixture.componentInstance.isLoadingData()).toBe(false);

    fixture.componentInstance.reportData.set({ pagos: [] });
    const pdfRequest = new Subject<Blob>();
    reportsService.getPaymentsReportPdf.mockReturnValueOnce(pdfRequest);
    fixture.componentInstance.generarPdf();
    fixture.componentInstance.actualizarFechaHasta('2026-09-14');

    pdfRequest.next(new Blob(['stale'], { type: 'application/pdf' }));
    pdfRequest.complete();

    expect(fixture.componentInstance.reportData()).toBeNull();
    expect(fixture.componentInstance.pdfBlob()).toBeNull();
    expect(fixture.componentInstance.activeView()).toBe('table');
    expect(fixture.componentInstance.isLoadingPdf()).toBe(false);
  });
});
