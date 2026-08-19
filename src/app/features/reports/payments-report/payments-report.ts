import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IPaymentsReportFilters, ISendReportEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { ClientsService } from '../../contracts/clients/services/clients.service';
import type { IClient } from '../../contracts/clients/interfaces/iclients.interface';

type DatePreset = 'currentMonth' | 'lastMonth' | 'last3Months' | 'lastYear';
type ReportView = 'table' | 'pdf';

interface PaymentRow {
  factura: string;
  fecha: string;
  clienteNombre: string;
  cuenta: string;
  medidor: string;
  emision: string;
  valor: string;
  valorNum?: number;
}

interface PaymentsReportData {
  pagos?: PaymentRow[];
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  totalGeneral?: string;
  totalRegistros?: number;
  [key: string]: unknown;
}

@Component({
  selector: 'app-payments-report',
  imports: [FormsModule, PdfPreviewerComponent, DatePickerComponent],
  templateUrl: './payments-report.html',
  styleUrl: './payments-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsReportComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly clientsService = inject(ClientsService);
  private readonly toast = inject(ToastService);

  // Filtros del reporte de abonos
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly clienteId = signal('');
  readonly selectedClientLabel = signal('');
  readonly selectedClientName = signal('');

  // Vista activa: tabla o PDF
  readonly activeView = signal<ReportView>('table');

  // Resultados
  readonly reportData = signal<PaymentsReportData | null>(null);
  readonly pdfBlob = signal<Blob | null>(null);

  // Estados de carga
  readonly isLoadingData = signal(false);
  readonly isLoadingPdf = signal(false);

  // Envío por email
  readonly destinatario = signal('');
  readonly subject = signal('');
  readonly isSendingEmail = signal(false);

  // Buscador de clientes
  readonly searchTerm = signal('');
  readonly searchResults = signal<IClient[]>([]);
  readonly isSearching = signal(false);
  readonly searchError = signal('');
  readonly searchPerformed = signal(false);
  readonly isClientPickerOpen = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Modales
  readonly isEmailModalOpen = signal(false);

  // Validación cruzada de fechas: desde no puede ser mayor que hasta
  readonly rangoFechaInvalido = computed(
    () => !!this.fechaDesde() && !!this.fechaHasta() && this.fechaDesde() > this.fechaHasta(),
  );

  // Email de destino inválido (vacío o con formato incorrecto)
  readonly esEmailInvalido = computed(() => {
    const email = this.destinatario().trim();
    return email === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  });

  readonly tableRows = computed(() => {
    return this.reportData()?.pagos ?? [];
  });

  readonly totalRecaudado = computed(() => {
    const data = this.reportData();
    if (!data) return '0.00';
    if (data.totalGeneral !== undefined) return String(data.totalGeneral);
    const sum = (data.pagos ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0);
    return sum.toFixed(2);
  });

  readonly totalRegistros = computed(() => {
    const data = this.reportData();
    if (!data) return 0;
    return data.totalRegistros ?? data.pagos?.length ?? 0;
  });

  private buildFilters(): IPaymentsReportFilters {
    const filters: IPaymentsReportFilters = {};
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const cliente = this.clienteId().trim();

    if (desde) filters.fechaDesde = desde;
    if (hasta) filters.fechaHasta = hasta;
    if (cliente) filters.clienteId = cliente;
    return filters;
  }

  // ---------- Presets rápidos de rango de fechas ----------

  aplicarPreset(preset: DatePreset): void {
    const hoy = new Date();
    const desde = new Date(hoy);
    const hasta = new Date(hoy);

    switch (preset) {
      case 'currentMonth':
        desde.setDate(1);
        break;
      case 'lastMonth':
        desde.setMonth(desde.getMonth() - 1, 1);
        hasta.setDate(0);
        break;
      case 'last3Months':
        desde.setMonth(desde.getMonth() - 3);
        break;
      case 'lastYear':
        desde.setFullYear(desde.getFullYear() - 1);
        break;
    }

    this.fechaDesde.set(this.toIsoDate(desde));
    this.fechaHasta.set(this.toIsoDate(hasta));
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ---------- Buscador de clientes ----------

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.buscarClientes(), 400);
  }

  abrirBuscadorClientes(): void {
    this.isClientPickerOpen.set(true);
    if (!this.searchPerformed()) {
      this.buscarClientes();
    }
  }

  cerrarBuscadorClientes(): void {
    this.isClientPickerOpen.set(false);
  }

  buscarClientes(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }

    const term = this.searchTerm().trim();
    if (!term) {
      this.searchResults.set([]);
      this.searchError.set('');
      this.searchPerformed.set(false);
      return;
    }

    this.isSearching.set(true);
    this.searchError.set('');
    this.clientsService.searchClients({ nombreCompleto: term, page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.searchResults.set(res.data);
        this.searchPerformed.set(true);
        this.isSearching.set(false);
      },
      error: (err) => {
        this.searchResults.set([]);
        this.searchPerformed.set(true);
        this.searchError.set(this.getErrorMessage(err, 'No se pudieron buscar los clientes'));
        this.isSearching.set(false);
      },
    });
  }

  seleccionarCliente(cliente: IClient): void {
    this.clienteId.set(String(cliente.clienteId ?? cliente.id ?? cliente.clientId ?? ''));
    const nombre = this.formatClientName(cliente);
    this.selectedClientLabel.set(`${nombre} · ${cliente.identificacion}`);
    this.selectedClientName.set(nombre);
    this.destinatario.set(cliente.email?.trim() ?? '');
    this.isClientPickerOpen.set(false);
  }

  formatClientName(cliente: IClient): string {
    if (cliente.razonSocial) {
      return cliente.razonSocial;
    }
    return `${cliente.nombres ?? ''} ${cliente.apellidos ?? ''}`.trim();
  }

  // ---------- Consultar (carga JSON -> tabla) ----------

  consultar(): void {
    if (this.rangoFechaInvalido()) return;

    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.activeView.set('table');

    this.isLoadingData.set(true);
    this.reportsService.getPaymentsReport(this.buildFilters()).subscribe({
      next: (data) => {
        this.reportData.set(data as unknown as PaymentsReportData);
        this.isLoadingData.set(false);
      },
      error: (err) => {
        this.isLoadingData.set(false);
        this.toast.error(
          this.getErrorMessage(err, 'No se pudieron cargar los datos del reporte de abonos'),
          'Error',
        );
      },
    });
  }

  // ---------- Toggle de vista ----------

  setView(view: ReportView): void {
    this.activeView.set(view);
    if (view === 'pdf' && !this.pdfBlob()) {
      this.generarPdf();
    }
  }

  // ---------- Generar PDF ----------

  generarPdf(): void {
    this.isLoadingPdf.set(true);
    this.reportsService.getPaymentsReportPdf(this.buildFilters()).subscribe({
      next: (blob) => {
        this.pdfBlob.set(blob);
        this.isLoadingPdf.set(false);
      },
      error: (err) => {
        this.isLoadingPdf.set(false);
        this.activeView.set('table');
        this.toast.error(
          this.getErrorMessage(err, 'No se pudo generar el PDF del reporte'),
          'Error',
        );
      },
    });
  }

  // ---------- Descargar PDF ----------

  descargarPdf(): void {
    const blob = this.pdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-abonos-${this.clienteId() || 'general'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Envío por email (modal) ----------

  abrirModalEmail(): void {
    this.isEmailModalOpen.set(true);
  }

  cerrarModalEmail(): void {
    if (this.isSendingEmail()) {
      return;
    }
    this.isEmailModalOpen.set(false);
  }

  enviarEmail(): void {
    const cliente = this.clienteId().trim();
    if (!cliente) {
      this.toast.error('Seleccione un cliente para enviar el reporte', 'Error');
      return;
    }

    const body: ISendReportEmailBody = {
      clienteId: cliente,
      destinatario: this.destinatario().trim() || undefined,
      subject: this.subject().trim() || undefined,
    };

    this.isSendingEmail.set(true);
    this.reportsService.sendPaymentsReportEmail(body).subscribe({
      next: () => {
        this.isSendingEmail.set(false);
        this.isEmailModalOpen.set(false);
        this.destinatario.set('');
        this.subject.set('');
        this.toast.success('Reporte enviado por email', 'Éxito');
      },
      error: (err) => {
        this.isSendingEmail.set(false);
        this.toast.error(
          this.getErrorMessage(err, 'No se pudo enviar el reporte por email'),
          'Error',
        );
      },
    });
  }

  limpiar(): void {
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.clienteId.set('');
    this.selectedClientLabel.set('');
    this.selectedClientName.set('');
    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searchError.set('');
    this.searchPerformed.set(false);
    this.destinatario.set('');
    this.subject.set('');
    this.activeView.set('table');
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const inner = (err as { error?: unknown }).error;
      if (inner && typeof inner === 'object' && 'message' in inner) {
        const message = (inner as { message?: unknown }).message;
        if (typeof message === 'string' && message) {
          return message;
        }
      }
    }
    return fallback;
  }
}
