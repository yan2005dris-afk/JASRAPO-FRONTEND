import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IConnectionHistoryFilters, ISendReportEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { ContractsService } from '../../contracts/service-contracts/services/contracts.service';
import type { IContract } from '../../contracts/service-contracts/interfaces/icontract.interface';

type DatePreset = 'currentMonth' | 'lastMonth' | 'last3Months' | 'lastYear';

@Component({
  selector: 'app-connection-history',
  imports: [FormsModule, PdfPreviewerComponent, DatePickerComponent],
  templateUrl: './connection-history.html',
  styleUrl: './connection-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionHistoryComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly contractsService = inject(ContractsService);
  private readonly toast = inject(ToastService);

  // Filtros del historial de conexión
  readonly contratoId = signal('');
  readonly selectedContractNumber = signal('');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');

  // Resultados
  readonly pdfBlob = signal<Blob | null>(null);
  readonly isLoadingPdf = signal(false);

  // Envío por email
  readonly destinatario = signal('');
  readonly subject = signal('');
  readonly isSendingEmail = signal(false);

  // Buscador de contratos
  readonly searchTerm = signal('');
  readonly searchResults = signal<IContract[]>([]);
  readonly isSearching = signal(false);
  readonly searchError = signal('');
  readonly searchPerformed = signal(false);
  readonly selectedContractName = signal('');
  readonly isContractPickerOpen = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Modales
  readonly isEmailModalOpen = signal(false);

  // Validación cruzada de fechas: desde no puede ser mayor que hasta
  readonly rangoFechaInvalido = computed(
    () =>
      !!this.fechaDesde() &&
      !!this.fechaHasta() &&
      this.fechaDesde() > this.fechaHasta(),
  );

  // Email de destino inválido (vacío o con formato incorrecto)
  readonly esEmailInvalido = computed(() => {
    const email = this.destinatario().trim();
    return email === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  });

  private buildFilters(): IConnectionHistoryFilters | null {
    const contrato = this.contratoId().trim();
    if (!contrato) {
      return null;
    }

    const filters: IConnectionHistoryFilters = { contratoId: contrato };
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();

    if (desde) filters.fechaDesde = desde;
    if (hasta) filters.fechaHasta = hasta;
    return filters;
  }

  // ---------- Presets rápidos de rango de fechas ----------

  aplicarPreset(preset: DatePreset): void {
    const hoy = new Date();
    const desde = new Date(hoy);
    const hasta = new Date(hoy);

    switch (preset) {
      case 'currentMonth':
        // Primer día del mes actual hasta hoy
        desde.setDate(1);
        break;
      case 'lastMonth':
        // Todo el mes anterior
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

  // ---------- Buscador de contratos ----------

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.buscarContratos(), 400);
  }

  abrirBuscadorContratos(): void {
    this.isContractPickerOpen.set(true);
    if (!this.searchPerformed()) {
      this.buscarContratos();
    }
  }

  cerrarBuscadorContratos(): void {
    this.isContractPickerOpen.set(false);
  }

  buscarContratos(): void {
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
    this.contractsService
      .getContracts({ search: term, page: 1, limit: 50 })
      .subscribe({
        next: (res) => {
          this.searchResults.set(res.data);
          this.searchPerformed.set(true);
          this.isSearching.set(false);
        },
        error: (err) => {
          this.searchResults.set([]);
          this.searchPerformed.set(true);
          this.searchError.set(this.getErrorMessage(err, 'No se pudieron buscar los contratos'));
          this.isSearching.set(false);
        },
      });
  }

  seleccionarContrato(contrato: IContract): void {
    this.contratoId.set(String(contrato.contratoId));
    this.selectedContractNumber.set(contrato.numeroGuia);
    this.selectedContractName.set(this.formatClientName(contrato.cliente));
    this.destinatario.set(contrato.cliente.email?.trim() ?? '');
    this.isContractPickerOpen.set(false);
  }

  formatClientName(cliente: IContract['cliente']): string {
    if (cliente.razonSocial) {
      return cliente.razonSocial;
    }
    return `${cliente.nombres} ${cliente.apellidos}`.trim();
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
      this.toast.error('Seleccione un contrato para generar el reporte', 'Error');
      return;
    }

    this.isLoadingPdf.set(true);
    this.reportsService.getConnectionHistoryPdf(filters).subscribe({
      next: (blob) => {
        this.pdfBlob.set(blob);
        this.isLoadingPdf.set(false);
        this.toast.success('PDF generado correctamente', 'Éxito');
      },
      error: (err) => {
        this.isLoadingPdf.set(false);
        this.toast.error(this.getErrorMessage(err, 'No se pudo generar el PDF del reporte'), 'Error');
      },
    });
  }

  enviarEmail(): void {
    const contrato = this.contratoId().trim();
    if (!contrato) {
      this.toast.error('Seleccione un contrato para enviar el reporte', 'Error');
      return;
    }

    const body: ISendReportEmailBody = {
      contratoId: contrato,
      destinatario: this.destinatario().trim() || undefined,
      subject: this.subject().trim() || undefined,
    };

    this.isSendingEmail.set(true);
    this.reportsService.sendConnectionHistoryEmail(body).subscribe({
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
    this.contratoId.set('');
    this.selectedContractNumber.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.pdfBlob.set(null);
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searchError.set('');
    this.searchPerformed.set(false);
    this.selectedContractName.set('');
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