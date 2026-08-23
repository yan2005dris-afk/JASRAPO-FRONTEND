import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ContractPickerComponent } from '../../../shared/components/contract-picker/contract-picker.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IAccountStatementFilters, ISendReportEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import type { IContract } from '../../contracts/service-contracts/interfaces/icontract.interface';

type DatePreset = 'currentMonth' | 'lastMonth' | 'last3Months' | 'lastYear';
type ReportView = 'table' | 'pdf';

export interface AccountStatementMonth {
  mes: string;
  lectActual: string;
  lectAnterior: string;
  consu: string;
  excede: string;
  cargoFijo: string;
  excedenteValor: string;
  total: string;
  intMora?: string;
  tasaSeg?: string;
  convenio?: string;
  totalMes?: string;
  pagos: string;
  saldo: string;
}

export interface AccountStatementYear {
  nombre: string;
  meses: AccountStatementMonth[];
  subtotalAnual: string;
  pagos: string;
  saldo: string;
}

export interface AccountStatementReport {
  titulo?: string;
  fechaEmision?: string;
  sector?: string;
  cuenta?: string;
  medidor?: string;
  tarifaTipo?: string;
  clienteNombre?: string;
  clienteIdentificacion?: string;
  clienteDireccion?: string;
  cargoFijo?: string;
  factor?: string;
  years: AccountStatementYear[];
  deudaTotal: string;
}

export interface AccountStatementData {
  reporte: AccountStatementReport;
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
    if (!raw?.reporte?.years) return [];

    return raw.reporte.years.map((year) => ({
      nombre: year.nombre,
      subtotalAnual: year.subtotalAnual,
      pagos: year.pagos,
      saldo: year.saldo,
      saldoNegativo: Number(year.saldo) < 0,
      meses: (year.meses ?? []).map((mes) => ({
        mes: mes.mes,
        lectActual: mes.lectActual,
        lectAnterior: mes.lectAnterior,
        consumo: mes.consu,
        excedente: mes.excede,
        cargoFijo: mes.cargoFijo,
        excedenteValor: mes.excedenteValor,
        total: mes.totalMes ?? mes.total,
        pagos: mes.pagos,
        saldo: mes.saldo,
        saldoNegativo: Number(mes.saldo) < 0,
      })),
    }));
  });

  readonly deudaTotal = computed(() => {
    const raw = this.reportData();
    if (raw?.reporte?.deudaTotal !== undefined) {
      return Number(raw.reporte.deudaTotal).toFixed(2);
    }
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
