import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ContractPickerComponent } from '../../../shared/components/contract-picker/contract-picker.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  IAccountStatementFilters,
  ISendReportEmailBody,
} from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import type { IContract } from '../../contracts/service-contracts/interfaces/icontract.interface';

type DatePreset = 'currentMonth' | 'lastMonth' | 'last3Months' | 'lastYear';
type ReportView = 'table' | 'pdf';

// Shape of the JSON response from /reports/account-statement
interface AccountStatementPeriod {
  prefactura?: {
    abono?: number;
    periodoRel?: { nombre?: string };
  };
  lecturas?: Array<{
    fecha?: string;
    lecturaActual?: number;
    lecturaAnterior?: number;
    consumoCalculado?: number;
  }>;
}

interface AccountStatementData {
  contratoId?: string | number;
  contrato?: {
    cliente?: {
      nombres?: string;
      apellidos?: string;
      razonSocial?: string;
      identificacion?: string;
      email?: string;
      direccionDomicilio?: string;
    };
    sector?: { nombre?: string };
    categoriaTarifa?: {
      nombre?: string;
      consumoMinimoMensual?: number;
      valorBase?: number;
      valorExcedenteM3?: number;
    };
    historialMedidores?: Array<{ medidor?: { serie?: string } }>;
    numeroGuia?: string;
  };
  periods?: AccountStatementPeriod[];
}

@Component({
  selector: 'app-client-statement',
  imports: [FormsModule, PdfPreviewerComponent, DatePickerComponent, ContractPickerComponent],
  templateUrl: './client-statement.html',
  styleUrl: './client-statement.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientStatementComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly toast = inject(ToastService);

  // Filtros del estado de cuenta
  readonly contratoId = signal('');
  readonly selectedContractNumber = signal('');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');

  // Vista activa: tabla o PDF
  readonly activeView = signal<ReportView>('table');

  // Resultados
  readonly reportData = signal<AccountStatementData | null>(null);
  readonly pdfBlob = signal<Blob | null>(null);

  // Estados de carga
  readonly isLoadingData = signal(false);
  readonly isLoadingPdf = signal(false);

  // Envío por email
  readonly destinatario = signal('');
  readonly subject = signal('');
  readonly isSendingEmail = signal(false);

  // Buscador de contratos
  readonly selectedContractName = signal('');
  readonly isContractPickerOpen = signal(false);

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

  // Computed para la tabla: datos procesados del JSON
  readonly tableYears = computed(() => {
    const raw = this.reportData();
    if (!raw) return [];

    const periods = (raw.periods ?? []) as AccountStatementPeriod[];
    const tarifa = raw.contrato?.categoriaTarifa;
    const consumoBase = Number(tarifa?.consumoMinimoMensual ?? 0);
    const valorBase = Number(tarifa?.valorBase ?? 0);
    const valorExcedente = Number(tarifa?.valorExcedenteM3 ?? 0);

    const years: Array<{
      nombre: string;
      meses: Array<{
        mes: string;
        lectActual: string;
        lectAnterior: string;
        consumo: string;
        excedente: string;
        cargoFijo: string;
        excedenteValor: string;
        total: string;
        pagos: string;
        saldo: string;
        saldoNegativo: boolean;
      }>;
      subtotalAnual: string;
      pagos: string;
      saldo: string;
      saldoNegativo: boolean;
    }> = [];

    for (const period of periods) {
      const periodoNombre = period.prefactura?.periodoRel?.nombre ?? '—';
      const abonoAnual = Number(period.prefactura?.abono ?? 0);
      const lecturas = period.lecturas ?? [];

      let saldoAcumulado = 0;

      const meses = lecturas.map((lectura, idx) => {
        const fecha = lectura.fecha ? new Date(lectura.fecha) : null;
        const consumoM3 = Number(lectura.consumoCalculado ?? 0);
        const excede = Math.max(consumoM3 - consumoBase, 0);
        const excedentePrecio = excede * valorExcedente;
        const totalMes = valorBase + excedentePrecio;

        const pagoMes = abonoAnual > 0 ? +(abonoAnual / 12).toFixed(2) : 0;
        const pagoAjustado = idx === 11 ? abonoAnual - pagoMes * 11 : pagoMes;

        saldoAcumulado = saldoAcumulado + totalMes - pagoAjustado;

        return {
          mes: fecha
            ? fecha.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })
            : '—',
          lectActual: Number(lectura.lecturaActual ?? 0).toFixed(2),
          lectAnterior: Number(lectura.lecturaAnterior ?? 0).toFixed(2),
          consumo: Math.min(consumoM3, consumoBase).toFixed(2),
          excedente: excede.toFixed(2),
          cargoFijo: valorBase.toFixed(2),
          excedenteValor: excedentePrecio.toFixed(2),
          total: totalMes.toFixed(2),
          pagos: pagoAjustado.toFixed(2),
          saldo: saldoAcumulado.toFixed(2),
          saldoNegativo: saldoAcumulado < 0,
        };
      });

      const subtotalAnual = meses.reduce((sum, m) => sum + Number(m.total), 0);

      years.push({
        nombre: periodoNombre,
        meses,
        subtotalAnual: subtotalAnual.toFixed(2),
        pagos: abonoAnual.toFixed(2),
        saldo: saldoAcumulado.toFixed(2),
        saldoNegativo: saldoAcumulado < 0,
      });
    }

    return years;
  });

  readonly deudaTotal = computed(() => {
    let total = 0;
    for (const year of this.tableYears()) {
      const saldo = Number(year.saldo);
      if (saldo > 0) total += saldo;
    }
    return total.toFixed(2);
  });

  private buildFilters(): IAccountStatementFilters | null {
    const contrato = this.contratoId().trim();
    if (!contrato) {
      return null;
    }

    const filters: IAccountStatementFilters = { contratoId: contrato };
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

  // ---------- Buscador de contratos ----------

  abrirBuscadorContratos(): void {
    this.isContractPickerOpen.set(true);
  }

  onContractSelected(contract: IContract): void {
    this.contratoId.set(String(contract.contratoId));
    this.selectedContractNumber.set(contract.numeroGuia);
    this.selectedContractName.set(ContractPickerComponent.formatClientName(contract.cliente));
    this.destinatario.set(contract.cliente.email?.trim() ?? '');
    this.isContractPickerOpen.set(false);
  }

  onContractPickerClosed(): void {
    this.isContractPickerOpen.set(false);
  }

  // ---------- Consultar (carga JSON → tabla) ----------

  consultar(): void {
    const filters = this.buildFilters();
    if (!filters) {
      this.toast.error('Seleccione un contrato para consultar el reporte', 'Error');
      return;
    }
    if (this.rangoFechaInvalido()) return;

    // Reset resultados previos
    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.activeView.set('table');

    this.isLoadingData.set(true);
    this.reportsService.getAccountStatement(filters).subscribe({
      next: (data) => {
        this.reportData.set(data as unknown as AccountStatementData);
        this.isLoadingData.set(false);
      },
      error: (err) => {
        this.isLoadingData.set(false);
        this.toast.error(
          this.getErrorMessage(err, 'No se pudieron cargar los datos del reporte'),
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
      this.toast.error('Seleccione un contrato para generar el PDF', 'Error');
      return;
    }

    this.isLoadingPdf.set(true);
    this.reportsService.getAccountStatementPdf(filters).subscribe({
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
    a.download = `estado-de-cuenta-${this.selectedContractNumber() || this.contratoId()}.pdf`;
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
    this.reportsService.sendAccountStatementEmail(body).subscribe({
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
    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.selectedContractName.set('');
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
