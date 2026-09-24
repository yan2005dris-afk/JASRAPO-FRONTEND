import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ReportsService } from '../services/reports.service';
import { ReportWorkspaceComponent } from '../shared/report-workspace/report-workspace.component';
import { ClientsListComponent } from './clients-list';

describe('ClientsListComponent', () => {
  let fixture: ComponentFixture<ClientsListComponent>;
  let reportsService: {
    getClientsListPdf: ReturnType<typeof vi.fn>;
    sendClientsListEmail: ReturnType<typeof vi.fn>;
    exportClientsList: ReturnType<typeof vi.fn>;
    downloadBlob: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    reportsService = {
      getClientsListPdf: vi.fn(() => of(new Blob(['pdf'], { type: 'application/pdf' }))),
      sendClientsListEmail: vi.fn(() => of({})),
      exportClientsList: vi.fn(() => of(new Blob(['export'], { type: 'text/csv' }))),
      downloadBlob: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ClientsListComponent],
      providers: [
        { provide: ReportsService, useValue: reportsService },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientsListComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clientReportLinksExposeCorrectHref', () => {
    const pdf = new Blob(['clients'], { type: 'application/pdf' });
    fixture.componentInstance.pdfBlob.set(pdf);
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clients');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const createElement = vi.spyOn(document, 'createElement');

    fixture.componentInstance.descargarPdf();

    const anchor = createElement.mock.results.find(
      (result) => result.value instanceof HTMLAnchorElement,
    )?.value as HTMLAnchorElement;
    expect(anchor.href).toBe('blob:clients');
    expect(anchor.download).toBe('listado-clientes-todos.pdf');
    expect(createObjectUrl).toHaveBeenCalledWith(pdf);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:clients');
  });

  it('downloadAndEmailPreserveVisibleFilters', () => {
    fixture.componentInstance.actualizarEstado('false');
    fixture.componentInstance.actualizarFechaDesde('2026-08-01');
    fixture.componentInstance.actualizarFechaHasta('2026-08-31');

    fixture.componentInstance.generarPdf();
    fixture.componentInstance.enviarEmail({
      destinatario: 'reportes@example.com',
      subject: 'Clientes inactivos',
    });

    const expectedFilters = {
      activo: false,
      fechaDesde: '2026-08-01',
      fechaHasta: '2026-08-31',
    };
    expect(reportsService.getClientsListPdf).toHaveBeenCalledWith(expectedFilters);
    expect(reportsService.sendClientsListEmail).toHaveBeenCalledWith({
      idempotencyKey: expect.any(String),
      destinatario: 'reportes@example.com',
      subject: 'Clientes inactivos',
      filtros: expectedFilters,
    });

    fixture.componentInstance.actualizarEstado('true');
    expect(fixture.componentInstance.pdfBlob()).toBeNull();
  });

  it('emailRetryReusesIdempotencyKeyWithoutDuplicatingReport', () => {
    reportsService.sendClientsListEmail.mockReturnValue(
      throwError(() => ({ error: { message: 'Respuesta incierta' } })),
    );
    const request = {
      destinatario: 'reportes@example.com',
      subject: 'Listado de clientes',
    };

    fixture.componentInstance.enviarEmail(request);
    const firstBody = reportsService.sendClientsListEmail.mock.calls[0][0];
    fixture.componentInstance.retryLastAction();
    fixture.componentInstance.enviarEmail(request);
    const retryBody = reportsService.sendClientsListEmail.mock.calls[1][0];

    expect(retryBody.idempotencyKey).toBe(firstBody.idempotencyKey);

    fixture.componentInstance.actualizarEstado('false');
    fixture.componentInstance.enviarEmail(request);
    const changedContextBody = reportsService.sendClientsListEmail.mock.calls[2][0];
    expect(changedContextBody.idempotencyKey).not.toBe(firstBody.idempotencyKey);
  });

  it('reportScreensUseSharedAsyncStatesWithoutInlineStyles', () => {
    expect(fixture.debugElement.query(By.directive(ReportWorkspaceComponent))).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('[style]')).toBeNull();

    reportsService.getClientsListPdf.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'No se pudo generar el listado' } })),
    );
    fixture.componentInstance.generarPdf();
    fixture.detectChanges();

    const error = (fixture.nativeElement as HTMLElement).querySelector('.report-status--error');
    expect(error?.textContent).toContain('No se pudo generar el listado');
    fixture.componentInstance.actualizarEstado('true');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.report-status--error'),
    ).toBeTruthy();
  });
});
