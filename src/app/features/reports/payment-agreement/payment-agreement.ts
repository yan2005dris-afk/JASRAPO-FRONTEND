import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IPaymentAgreementFilters, ISendReportEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { AgreementsService } from '../../contracts/service-agreements/services/agreements.service';
import type { IAgreementSummary } from '../../contracts/service-agreements/interfaces/iagreement.interface';

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

  // Resultados
  readonly pdfBlob = signal<Blob | null>(null);
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
        this.toast.success('PDF generado correctamente', 'Éxito');
      },
      error: (err) => {
        this.isLoadingPdf.set(false);
        this.toast.error(
          this.getErrorMessage(err, 'No se pudo generar el PDF del reporte'),
          'Error',
        );
      },
    });
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
    this.pdfBlob.set(null);
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searchError.set('');
    this.searchPerformed.set(false);
    this.destinatario.set('');
    this.subject.set('');
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
