import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ToastService } from '../../../shared/components/toast/toast.service';
import { ReportsService } from '../services/reports.service';
import { OverdueAccountsComponent } from './overdue-accounts';

/** Respuesta canónica del backend (totales calculados por el read model, no en el frontend). */
const canonicalResponse = {
  data: [
    {
      contratoId: 'c1',
      numeroGuia: 'G-001',
      clienteNombre: 'Ana Pérez',
      identificacion: '0102030405',
      sectorNombre: 'Norte',
      mesesVencidos: 3,
      saldoPendiente: '50.00',
      saldoPendienteNum: 50,
      ultimaEmision: '2026-08-01',
      medidorSerie: 'M-1',
    },
  ],
  meta: { total: 1, fechaCorte: '2026-09-15' },
  kpis: { totalMorosidad: '1234.56', totalMorosos: 7, mayorDeuda: '300.00' },
};

const firstMoroso = canonicalResponse.data[0];

describe('OverdueAccountsComponent', () => {
  let fixture: ComponentFixture<OverdueAccountsComponent>;
  let component: OverdueAccountsComponent;
  let reportsService: {
    getOverdueAccounts: ReturnType<typeof vi.fn>;
    getOverdueAccountsPdf: ReturnType<typeof vi.fn>;
    sendOverdueAccountsEmail: ReturnType<typeof vi.fn>;
  };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    reportsService = {
      getOverdueAccounts: vi.fn(() => of(canonicalResponse)),
      getOverdueAccountsPdf: vi.fn(() => of(new Blob(['pdf'], { type: 'application/pdf' }))),
      sendOverdueAccountsEmail: vi.fn(() => of({})),
    };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [OverdueAccountsComponent],
      providers: [
        { provide: ReportsService, useValue: reportsService },
        { provide: ToastService, useValue: toast },
        { provide: (await import('../../admin/sectores-prueba/services/sectores')).SectoresService, useValue: { getAllSectores: () => of({ data: [] }) } },
        { provide: (await import('../../admin/comunidades/services/comunidades.service')).ComunidadesService, useValue: { getAllComunidades: () => of({ data: [] }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OverdueAccountsComponent);
    component = fixture.componentInstance;
    // No se llama a detectChanges() para controlar explícitamente cuándo se consulta.
  });

  it('collectionDelinquencyQueryUsesApprovedCanonicalDefinitions', () => {
    component.fechaCorte.set('2026-09-15');
    component.consultar();

    // Consulta la fuente canónica (endpoint overdue-accounts) con los filtros construidos.
    expect(reportsService.getOverdueAccounts).toHaveBeenCalledWith({ fechaCorte: '2026-09-15' });

    // Los totales provienen del read model del backend; el frontend no los recalcula.
    expect(component.totalMorosidad()).toBe('1234.56');
    expect(component.totalMorososCount()).toBe(7);
    expect(component.mayorDeuda()).toBe('300.00');
  });

  it('collectionDelinquencyReportRejectsUnauthorizedAccess', () => {
    reportsService.getOverdueAccounts.mockReturnValueOnce(
      throwError(() => ({ status: 403, error: { message: 'No autorizado' } })),
    );

    component.consultar();

    // Sin acceso autorizado no se exponen datos ni documento.
    expect(component.reportData()).toBeNull();
    expect(component.filteredMorosos()).toHaveLength(0);
    expect(component.workspaceStatus()).toBe('error');
    expect(component.workspaceError()).toBe('No autorizado');
  });

  it('collectionDelinquencyTotalsMatchAcrossJsonPdfAndEmail', () => {
    component.fechaCorte.set('2026-09-15');

    component.consultar();
    component.generarPdfGeneral();
    component.enviarEmail({ destinatario: 'tesoreria@jasrapo.ec', subject: 'Morosidad' });

    const jsonFilters = reportsService.getOverdueAccounts.mock.calls.at(-1)?.[0];
    const pdfFilters = reportsService.getOverdueAccountsPdf.mock.calls.at(-1)?.[0];
    const emailBody = reportsService.sendOverdueAccountsEmail.mock.calls.at(-1)?.[0];

    const expectedFilters = { fechaCorte: '2026-09-15' };
    // JSON, PDF y correo comparten el mismo universo filtrado.
    expect(jsonFilters).toEqual(expectedFilters);
    expect(pdfFilters).toEqual(expectedFilters);
    expect(emailBody).toMatchObject(expectedFilters);
    expect(emailBody.destinatario).toBe('tesoreria@jasrapo.ec');
  });

  it('collectionDelinquencyFiltersAppearInOfficialPdf', () => {
    component.fechaCorte.set('2026-09-15');
    component.consultar();

    component.generarPdfGeneral();

    // El período/filtros viajan al documento oficial (los renderiza la plantilla del backend).
    expect(reportsService.getOverdueAccountsPdf).toHaveBeenCalledWith({
      fechaCorte: '2026-09-15',
    });

    // Y quedan visibles en pantalla como contexto trazable del reporte.
    const context = component.contextItems();
    expect(context).toContainEqual({ label: 'Fecha de corte', value: '2026-09-15' });
  });

  it('collectionDelinquencyWorkspacePreviewsDownloadsAndEmails', () => {
    // Consulta (JSON/tabla)
    component.consultar();
    expect(component.reportData()).not.toBeNull();
    expect(component.filteredMorosos()).toHaveLength(1);

    // Genera y previsualiza el PDF general en el modal
    component.generarPdfGeneral();
    expect(component.isGeneralPdfOpen()).toBe(true);
    expect(reportsService.getOverdueAccountsPdf).toHaveBeenCalledOnce();
    expect(component.generalPdfBlob()).toBeInstanceOf(Blob);

    // Correo del reporte general
    component.enviarEmail({ destinatario: 'tesoreria@jasrapo.ec' });
    expect(reportsService.sendOverdueAccountsEmail).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalled();
    expect(component.isEmailModalOpen()).toBe(false);
  });

  it('collectionDelinquencyRowDetailPreviewsIndividualContract', () => {
    component.fechaCorte.set('2026-09-15');
    component.consultar();

    component.abrirDetalle(firstMoroso);

    // El detalle individual filtra por el contrato de la fila (mismo endpoint canónico).
    expect(reportsService.getOverdueAccountsPdf).toHaveBeenCalledWith({
      contratoId: 'c1',
      fechaCorte: '2026-09-15',
    });
    expect(component.isDetalleOpen()).toBe(true);
    expect(component.detallePdfBlob()).toBeInstanceOf(Blob);
    expect(component.detalleTitulo()).toContain('Ana Pérez');
  });

  it('collectionDelinquencyTableSearchDoesNotEmptyWorkspace', () => {
    component.consultar();
    // Búsqueda local sin coincidencias: la tabla queda vacía…
    component.searchTermTable.set('zzz-sin-coincidencias');

    expect(component.filteredMorosos()).toHaveLength(0);
    // …pero el workspace NO se marca como vacío (el backend sí trajo filas y KPIs).
    expect(component.workspaceStatus()).toBe('idle');
    expect(component.totalMorosidad()).toBe('1234.56');
  });
});
