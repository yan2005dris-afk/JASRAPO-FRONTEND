import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IPaymentAgreementFilters, ISendReportEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { AgreementsService } from '../../contracts/service-agreements/services/agreements.service';
import type { IAgreementSummary } from '../../contracts/service-agreements/interfaces/iagreement.interface';

type ReportView = 'table' | 'pdf';

interface PaymentAgreementData {
  convenio?: {
    createdAt?: string;
    fechaInicio?: string;
    fechaPrimerPago?: string;
    cuotaMensual?: number | string;
    deudaTotal?: number | string;
    abonoInicial?: number | string;
    numeroCuotas?: number;
    cliente?: {
      nombres?: string | null;
      apellidos?: string | null;
      razonSocial?: string | null;
      identificacion?: string | null;
    };
    contrato?: {
      numeroGuia?: string | null;
    };
  };
  [key: string]: unknown;
}

@Component({
  selector: 'app-payment-agreement',
  imports: [FormsModule, PdfPreviewerComponent],
  templateUrl: './payment-agreement.html',
  styleUrl: './payment-agreement.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentAgreementComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly toast = inject(ToastService);

  // Filtro del convenio de pago
  readonly convenioId = signal('');
  readonly selectedAgreementLabel = signal('');
  readonly selectedAgreementName = signal('');

  // Vista activa: tabla o PDF
  readonly activeView = signal<ReportView>('table');

  // Resultados
  readonly reportData = signal<PaymentAgreementData | null>(null);
  readonly pdfBlob = signal<Blob | null>(null);

  // Estados de carga
  readonly isLoadingData = signal(false);
  readonly isLoadingPdf = signal(false);

  // Envío por email
  readonly destinatario = signal('');
  readonly subject = signal('');
  readonly isSendingEmail = signal(false);

  // Buscador de convenios
  readonly searchTerm = signal('');
  readonly searchResults = signal<IAgreementSummary[]>([]);
  readonly isSearching = signal(false);
  readonly searchError = signal('');
  readonly searchPerformed = signal(false);
  readonly isAgreementPickerOpen = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Modales
  readonly isEmailModalOpen = signal(false);

  // Email de destino inválido (vacío o con formato incorrecto)
  readonly esEmailInvalido = computed(() => {
    const email = this.destinatario().trim();
    return email === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  });

  readonly convenioInfo = computed(() => {
    const data = this.reportData();
    const c = data?.convenio;
    if (!c) return null;

    const cliente = c.cliente;
    const nombre = cliente
      ? [cliente.nombres, cliente.apellidos].filter(Boolean).join(' ') || cliente.razonSocial || '—'
      : '—';

    return {
      clienteNombre: nombre,
      identificacion: cliente?.identificacion || '—',
      numeroGuia: c.contrato?.numeroGuia || '—',
      deudaTotal: Number(c.deudaTotal || 0).toFixed(2),
      abonoInicial: Number(c.abonoInicial || 0).toFixed(2),
      numeroCuotas: c.numeroCuotas || 0,
      cuotaMensual: Number(c.cuotaMensual || 0).toFixed(2),
      fechaInicio: c.fechaInicio ? new Date(c.fechaInicio).toLocaleDateString('es-EC') : '—',
      fechaPrimerPago: c.fechaPrimerPago
        ? new Date(c.fechaPrimerPago).toLocaleDateString('es-EC')
        : '—',
    };
  });

  private buildFilters(): IPaymentAgreementFilters | null {
    const convenio = this.convenioId().trim();
    if (!convenio) {
      return null;
    }
    return { convenioId: convenio };
  }

  // ---------- Buscador de convenios ----------

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.buscarConvenios(), 400);
  }

  abrirBuscadorConvenios(): void {
    this.isAgreementPickerOpen.set(true);
    if (!this.searchPerformed()) {
      this.buscarConvenios();
    }
  }

  cerrarBuscadorConvenios(): void {
    this.isAgreementPickerOpen.set(false);
  }

  buscarConvenios(): void {
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
    this.agreementsService.getAgreements({ search: term, page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.searchResults.set(res.data);
        this.searchPerformed.set(true);
        this.isSearching.set(false);
      },
      error: (err) => {
        this.searchResults.set([]);
        this.searchPerformed.set(true);
        this.searchError.set(this.getErrorMessage(err, 'No se pudieron buscar los convenios'));
        this.isSearching.set(false);
      },
    });
  }

  seleccionarConvenio(agreement: IAgreementSummary): void {
    this.convenioId.set(String(agreement.convenioId));
    this.selectedAgreementLabel.set(
      `Convenio #${agreement.convenioId} · ${agreement.numeroGuia ?? ''}`.trim(),
    );
    this.selectedAgreementName.set(agreement.clienteNombre ?? '');
    this.destinatario.set(agreement.clienteEmail?.trim() ?? '');
    this.isAgreementPickerOpen.set(false);
  }

  formatAgreementEstado(estado: IAgreementSummary['estado']): string {
    const codigo = typeof estado === 'string' ? estado : (estado?.codigo ?? '');
    switch (codigo) {
      case 'ACTIVO':
        return 'Activo';
      case 'PENDIENTE_ABONO':
        return 'Pendiente de abono';
      case 'PREPARADO':
        return 'Preparado';
      case 'ANULADO':
        return 'Anulado';
      case 'PAGADO':
        return 'Pagado';
      default:
        return codigo;
    }
  }

  formatMoney(value: number): string {
    const num = Number(value);
    if (value === null || value === undefined || Number.isNaN(num)) {
      return '$0.00';
    }
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // ---------- Consultar (carga JSON -> tabla) ----------

  consultar(): void {
    const filters = this.buildFilters();
    if (!filters) {
      this.toast.error('Seleccione un convenio para consultar el reporte', 'Error');
      return;
    }

    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.activeView.set('table');

    this.isLoadingData.set(true);
    this.reportsService.getPaymentAgreement(filters).subscribe({
      next: (data) => {
        this.reportData.set(data as unknown as PaymentAgreementData);
        this.isLoadingData.set(false);
      },
      error: (err) => {
        this.isLoadingData.set(false);
        this.toast.error(
          this.getErrorMessage(err, 'No se pudieron cargar los datos del convenio'),
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
    const filters = this.buildFilters();
    if (!filters) {
      this.toast.error('Seleccione un convenio para generar el reporte', 'Error');
      return;
    }

    this.isLoadingPdf.set(true);
    this.reportsService.getPaymentAgreementPdf(filters).subscribe({
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
    a.download = `convenio-pago-${this.convenioId()}.pdf`;
    a.href = url;
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
    const convenio = this.convenioId().trim();
    if (!convenio) {
      this.toast.error('Seleccione un convenio para enviar el reporte', 'Error');
      return;
    }

    const body: ISendReportEmailBody = {
      convenioId: convenio,
      destinatario: this.destinatario().trim() || undefined,
      subject: this.subject().trim() || undefined,
    };

    this.isSendingEmail.set(true);
    this.reportsService.sendPaymentAgreementEmail(body).subscribe({
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
    this.convenioId.set('');
    this.selectedAgreementLabel.set('');
    this.selectedAgreementName.set('');
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
