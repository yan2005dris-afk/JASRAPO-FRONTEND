import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { ContractPickerComponent } from '../../../shared/components/contract-picker/contract-picker.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IConnectionHistoryFilters, ISendReportEmailBody } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import type { IContract } from '../../contracts/service-contracts/interfaces/icontract.interface';

type DatePreset = 'currentMonth' | 'lastMonth' | 'last3Months' | 'lastYear';
type ReportView = 'table' | 'pdf';

interface ConnectionHistoryPrefactura {
  periodoRel?: {
    nombre?: string;
    fechaInicio?: string;
    fechaFin?: string;
  };
  lecturaAnterior?: number | string;
  lecturaActual?: number | string;
  consumoM3?: number | string;
  totalPagar?: number | string;
  abono?: number | string;
  saldoActual?: number | string;
  contrato?: {
    cliente?: {
      nombres?: string;
      apellidos?: string;
      razonSocial?: string;
    };
    historialMedidores?: {
      medidor?: { serie?: string };
    }[];
  };
}

export interface ConnectionHistoryFila {
  emision: string;
  lectActual: string;
  lectAnterior: string;
  consumo: string;
  valEmision: string;
  abonos: string;
  saldo: string;
}

export interface ConnectionHistoryReport {
  titulo?: string;
  fechaEmision?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  cuenta?: string;
  clienteNombre?: string;
  medidor?: string;
  filas: ConnectionHistoryFila[];
  totalValEmision: string;
  totalAbonos: string;
  saldoFinal: string;
}

export interface ConnectionHistoryData {
  reporte?: ConnectionHistoryReport;
  // Fallbacks para compatibilidad
  contratoId?: string;
  prefacturas?: ConnectionHistoryPrefactura[];
  [key: string]: unknown;
}

@Component({
  selector: 'app-connection-history',
  imports: [FormsModule, PdfPreviewerComponent, DatePickerComponent, ContractPickerComponent],
  templateUrl: './connection-history.html',
  styleUrl: './connection-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionHistoryComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly toast = inject(ToastService);

  // Filtros del historial de conexión
  readonly contratoId = signal('');
  readonly selectedContractNumber = signal('');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');

  // Vista activa: tabla o PDF
  readonly activeView = signal<ReportView>('table');

  // Resultados
  readonly reportData = signal<ConnectionHistoryData | null>(null);
  readonly pdfBlob = signal<Blob | null>(null);

  // Estados de carga
  readonly isLoadingData = signal(false);
  readonly isLoadingPdf = signal(false);
  readonly isExporting = signal(false);

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

  readonly tableRows = computed(() => {
    const data = this.reportData();
    if (data?.reporte?.filas) {
      return data.reporte.filas.map((f) => ({
        emision: f.emision,
        lectAnterior: f.lectAnterior,
        lectActual: f.lectActual,
        consumo: f.consumo,
        valEmision: f.valEmision,
        abonos: f.abonos,
        saldo: f.saldo,
        saldoNum: Number(f.saldo || 0),
      }));
    }

    if (!data?.prefacturas) return [];

    return data.prefacturas.map((pf) => {
      const emision = pf.periodoRel?.nombre ?? '—';
      const lectActual = Number(pf.lecturaActual ?? 0).toFixed(0);
      const lectAnterior = Number(pf.lecturaAnterior ?? 0).toFixed(0);
      const consumo = Number(pf.consumoM3 ?? 0).toFixed(0);
      const valEmision = Number(pf.totalPagar ?? 0).toFixed(2);
      const abonos = Number(pf.abono ?? 0).toFixed(2);
      const saldo = Number(pf.saldoActual ?? 0).toFixed(2);

      return {
        emision,
        lectAnterior,
        lectActual,
        consumo,
        valEmision,
        abonos,
        saldo,
        saldoNum: Number(pf.saldoActual ?? 0),
      };
    });
  });

  readonly totalValEmision = computed(() => {
    const data = this.reportData();
    if (data?.reporte?.totalValEmision !== undefined) {
      return Number(data.reporte.totalValEmision).toFixed(2);
    }
    const pfs = data?.prefacturas ?? [];
    const sum = pfs.reduce((s, pf) => s + Number(pf.totalPagar ?? 0), 0);
    return sum.toFixed(2);
  });

  readonly totalAbonos = computed(() => {
    const data = this.reportData();
    if (data?.reporte?.totalAbonos !== undefined) {
      return Number(data.reporte.totalAbonos).toFixed(2);
    }
    const pfs = data?.prefacturas ?? [];
    const sum = pfs.reduce((s, pf) => s + Number(pf.abono ?? 0), 0);
    return sum.toFixed(2);
  });

  readonly saldoFinal = computed(() => {
    const data = this.reportData();
    if (data?.reporte?.saldoFinal !== undefined) {
      return Number(data.reporte.saldoFinal).toFixed(2);
    }
    const pfs = data?.prefacturas ?? [];
    const sum = pfs.reduce((s, pf) => s + Number(pf.saldoActual ?? 0), 0);
    return sum.toFixed(2);
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

  // ---------- Consultar (carga JSON -> tabla) ----------

  consultar(): void {
    const filters = this.buildFilters();
    if (!filters) {
      this.toast.error('Seleccione un contrato para consultar el historial', 'Error');
      return;
    }
    if (this.rangoFechaInvalido()) return;

    this.reportData.set(null);
    this.pdfBlob.set(null);
    this.activeView.set('table');

    this.isLoadingData.set(true);
    this.reportsService.getConnectionHistory(filters).subscribe({
      next: (data) => {
        this.reportData.set(data as unknown as ConnectionHistoryData);
        this.isLoadingData.set(false);
      },
      error: (err) => {
        this.isLoadingData.set(false);
        this.toast.error(
          this.getErrorMessage(err, 'No se pudieron cargar los datos del historial de conexión'),
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
      this.toast.error('Seleccione un contrato para generar el reporte', 'Error');
      return;
    }

    this.isLoadingPdf.set(true);
    this.reportsService.getConnectionHistoryPdf(filters).subscribe({
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
    this.reportsService.downloadBlob(
      blob,
      `historial-conexion-${this.selectedContractNumber() || this.contratoId()}.pdf`,
    );
  }

  descargarExcel(): void {
    const filters = this.buildFilters();
    if (!filters) return;
    this.isExporting.set(true);
    this.reportsService.exportConnectionHistory(filters, 'xlsx').subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.reportsService.downloadBlob(
          blob,
          `historial-conexion-${this.selectedContractNumber() || this.contratoId()}.xlsx`,
        );
        this.toast.success('Reporte Excel descargado exitosamente');
      },
      error: () => {
        this.isExporting.set(false);
        this.toast.error('No se pudo exportar el reporte en formato Excel');
      },
    });
  }

  descargarCsv(): void {
    const filters = this.buildFilters();
    if (!filters) return;
    this.isExporting.set(true);
    this.reportsService.exportConnectionHistory(filters, 'csv').subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.reportsService.downloadBlob(
          blob,
          `historial-conexion-${this.selectedContractNumber() || this.contratoId()}.csv`,
        );
        this.toast.success('Reporte CSV descargado exitosamente');
      },
      error: () => {
        this.isExporting.set(false);
        this.toast.error('No se pudo exportar el reporte en formato CSV');
      },
    });
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
