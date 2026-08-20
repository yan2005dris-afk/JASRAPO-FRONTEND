import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ElectronicBillingService } from './services/electronic-billing.service';
import {
  EstadoComprobante,
  IComprobante,
  IQueryComprobantesParams,
  TipoComprobante,
} from './interfaces/ielectronic-billing.interface';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';

@Component({
  selector: 'app-electronic-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent, PaginationComponent, LocalDatePipe],
  templateUrl: './electronic-billing.html',
  styleUrl: './electronic-billing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectronicBillingComponent implements OnInit {
  private readonly sriService = inject(ElectronicBillingService);
  private readonly toast = inject(ToastService);

  // Filtros
  readonly identificacion = signal('');
  readonly tipoComprobante = signal<string>('');
  readonly estado = signal<string>('');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly searchTermTable = signal('');

  // Estados & Datos
  readonly comprobantes = signal<IComprobante[]>([]);
  readonly totalItems = signal(0);
  readonly isLoading = signal(false);
  readonly isSyncing = signal(false);
  readonly actionInProgress = signal<string | null>(null);

  // Detalle Modal
  readonly selectedComprobante = signal<IComprobante | null>(null);
  readonly isLoadingDetail = signal(false);

  // Paginación
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 25];

  // Catálogos
  readonly tiposComprobanteList = [
    { value: '', label: 'Todos los tipos' },
    { value: TipoComprobante.FACTURA, label: '01 - Factura' },
    { value: TipoComprobante.NOTA_CREDITO, label: '04 - Nota de Crédito' },
    { value: TipoComprobante.NOTA_DEBITO, label: '05 - Nota de Débito' },
    { value: TipoComprobante.RETENCION, label: '07 - Retención' },
  ];

  readonly estadosList = [
    { value: '', label: 'Todos los estados' },
    { value: EstadoComprobante.AUTORIZADO, label: 'Autorizado' },
    { value: EstadoComprobante.PENDIENTE, label: 'Pendiente' },
    { value: EstadoComprobante.POR_EMITIR, label: 'Por Emitir' },
    { value: EstadoComprobante.BORRADOR, label: 'Borrador' },
    { value: EstadoComprobante.EN_PROCESO, label: 'En Proceso' },
    { value: EstadoComprobante.DEVUELTA, label: 'Devuelta' },
    { value: EstadoComprobante.RECHAZADO, label: 'Rechazado' },
    { value: EstadoComprobante.ANULADO, label: 'Anulado' },
  ];

  ngOnInit(): void {
    this.cargarComprobantes();
  }

  // KPIs computados
  readonly totalAutorizados = computed(() => {
    return this.comprobantes().filter((c) => c.estado === EstadoComprobante.AUTORIZADO).length;
  });

  readonly totalPorEmitir = computed(() => {
    return this.comprobantes().filter(
      (c) =>
        c.estado === EstadoComprobante.POR_EMITIR ||
        c.estado === EstadoComprobante.BORRADOR ||
        c.estado === EstadoComprobante.PENDIENTE,
    ).length;
  });

  readonly totalRechazadosDevueltos = computed(() => {
    return this.comprobantes().filter(
      (c) =>
        c.estado === EstadoComprobante.DEVUELTA ||
        c.estado === EstadoComprobante.RECHAZADO ||
        c.estado === EstadoComprobante.NO_AUTORIZADO,
    ).length;
  });

  readonly totalMontoAutorizado = computed(() => {
    const sum = this.comprobantes()
      .filter((c) => c.estado === EstadoComprobante.AUTORIZADO)
      .reduce((acc, c) => acc + (Number(c.total) || 0), 0);
    return sum.toFixed(2);
  });

  readonly filteredComprobantes = computed(() => {
    const term = this.searchTermTable().trim().toLowerCase();
    const list = this.comprobantes();
    if (!term) return list;

    return list.filter(
      (c) =>
        c.claveAcceso.toLowerCase().includes(term) ||
        c.razonSocialComprador?.toLowerCase().includes(term) ||
        c.identificacionComprador?.toLowerCase().includes(term) ||
        c.secuencial?.toLowerCase().includes(term),
    );
  });

  cargarComprobantes(): void {
    this.isLoading.set(true);
    const params: IQueryComprobantesParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    if (this.identificacion().trim()) params.identificacionComprador = this.identificacion().trim();
    if (this.tipoComprobante()) params.tipoComprobante = this.tipoComprobante();
    if (this.estado()) params.estado = this.estado();
    if (this.fechaDesde()) params.fechaDesde = this.fechaDesde();
    if (this.fechaHasta()) params.fechaHasta = this.fechaHasta();

    this.sriService.getComprobantes(params).subscribe({
      next: (res) => {
        this.comprobantes.set(res.data || []);
        this.totalItems.set(res.meta?.total || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(
          this.getErrorMessage(err, 'Error al consultar comprobantes electrónicos'),
          'Error',
        );
      },
    });
  }

  limpiar(): void {
    this.identificacion.set('');
    this.tipoComprobante.set('');
    this.estado.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.searchTermTable.set('');
    this.currentPage.set(1);
    this.cargarComprobantes();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.cargarComprobantes();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.cargarComprobantes();
  }

  // Acciones individuales
  verDetalle(claveAcceso: string): void {
    this.isLoadingDetail.set(true);
    this.sriService.getComprobanteByClaveAcceso(claveAcceso).subscribe({
      next: (comp) => {
        this.selectedComprobante.set(comp);
        this.isLoadingDetail.set(false);
      },
      error: (err) => {
        this.isLoadingDetail.set(false);
        this.toast.error(
          this.getErrorMessage(err, 'No se pudo cargar el detalle del comprobante'),
          'Error',
        );
      },
    });
  }

  cerrarModalDetalle(): void {
    this.selectedComprobante.set(null);
  }

  descargarXml(claveAcceso: string): void {
    this.sriService.getXmlAutorizado(claveAcceso).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${claveAcceso}.xml`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.toast.error(this.getErrorMessage(err, 'El XML aún no está disponible'), 'Error');
      },
    });
  }

  emitirManual(claveAcceso: string): void {
    this.actionInProgress.set(claveAcceso);
    this.sriService.emitirManual(claveAcceso).subscribe({
      next: () => {
        this.toast.success('Emisión enviada al SRI con éxito', 'SRI');
        this.actionInProgress.set(null);
        this.cargarComprobantes();
      },
      error: (err) => {
        this.toast.error(this.getErrorMessage(err, 'No se pudo emitir el comprobante'), 'Error');
        this.actionInProgress.set(null);
      },
    });
  }

  reintentar(claveAcceso: string): void {
    this.actionInProgress.set(claveAcceso);
    this.sriService.reintentar(claveAcceso).subscribe({
      next: () => {
        this.toast.success('Reintento de comprobante ejecutado', 'SRI');
        this.actionInProgress.set(null);
        this.cargarComprobantes();
      },
      error: (err) => {
        this.toast.error(this.getErrorMessage(err, 'Error al reintentar envío'), 'Error');
        this.actionInProgress.set(null);
      },
    });
  }

  anular(claveAcceso: string): void {
    if (!confirm(`¿Está seguro de anular el comprobante local con clave: ${claveAcceso}?`)) {
      return;
    }
    this.actionInProgress.set(claveAcceso);
    this.sriService.anular(claveAcceso).subscribe({
      next: () => {
        this.toast.success('Comprobante anulado exitosamente', 'SRI');
        this.actionInProgress.set(null);
        this.cargarComprobantes();
      },
      error: (err) => {
        this.toast.error(this.getErrorMessage(err, 'No se pudo anular el comprobante'), 'Error');
        this.actionInProgress.set(null);
      },
    });
  }

  sincronizarConSri(): void {
    this.isSyncing.set(true);
    this.sriService.sincronizar().subscribe({
      next: () => {
        this.toast.success('Sincronización con el SRI completada', 'SRI');
        this.isSyncing.set(false);
        this.cargarComprobantes();
      },
      error: (err) => {
        this.toast.error(this.getErrorMessage(err, 'Error al sincronizar con SRI'), 'Error');
        this.isSyncing.set(false);
      },
    });
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case EstadoComprobante.AUTORIZADO:
        return 'text-bg-success';
      case EstadoComprobante.POR_EMITIR:
      case EstadoComprobante.BORRADOR:
        return 'text-bg-info';
      case EstadoComprobante.EN_PROCESO:
      case EstadoComprobante.PENDIENTE:
      case EstadoComprobante.RECIBIDA:
        return 'text-bg-warning';
      case EstadoComprobante.DEVUELTA:
      case EstadoComprobante.RECHAZADO:
      case EstadoComprobante.NO_AUTORIZADO:
        return 'text-bg-danger';
      case EstadoComprobante.ANULADO:
        return 'text-bg-secondary';
      default:
        return 'text-bg-light text-dark';
    }
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const inner = (err as { error?: unknown }).error;
      if (inner && typeof inner === 'object' && 'message' in inner) {
        const message = (inner as { message?: unknown }).message;
        if (typeof message === 'string' && message) return message;
      }
    }
    return fallback;
  }
}
