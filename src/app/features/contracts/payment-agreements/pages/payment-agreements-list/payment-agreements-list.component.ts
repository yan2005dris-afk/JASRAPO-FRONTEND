import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentAgreementsApi } from '../../data/payment-agreements.api';
import { IAgreement, IFindAllAgreementsParams } from '../../domain/models/payment-agreement.model';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../../../shared/components/table-skeleton/table-skeleton.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { TableExportService } from '../../../../../shared/services/table-export.service';
import {
  DropdownComponent,
  DropdownItem,
} from '../../../../../shared/components/dropdown/dropdown.component';
import { AgreementDetailModalComponent } from '../../components/agreement-detail-modal/agreement-detail-modal.component';

/** Espera tras la última tecla antes de consultar el backend. */
const SEARCH_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-payment-agreements-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    PaginationComponent,
    AgreementDetailModalComponent,
    DropdownComponent,
  ],
  templateUrl: './payment-agreements-list.component.html',
  styleUrl: './payment-agreements-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class PaymentAgreementsListComponent implements OnInit, OnDestroy {
  private readonly agreementsService = inject(PaymentAgreementsApi);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly exportItems: DropdownItem[] = [
    { label: 'Exportar a PDF', action: 'pdf', icon: 'bi bi-file-earmark-pdf-fill text-danger' },
    {
      label: 'Exportar a Excel (.xls)',
      action: 'excel',
      icon: 'bi bi-file-earmark-excel-fill text-success',
    },
    { label: 'Exportar a CSV', action: 'csv', icon: 'bi bi-file-earmark-text-fill text-primary' },
  ];

  handleExportAction(action: string): void {
    if (action === 'pdf') this.exportToPdf();
    else if (action === 'excel') this.exportToExcel();
    else if (action === 'csv') this.exportToCsv();
  }

  // List State Signals
  readonly agreements = signal<IAgreement[]>([]);
  readonly totalItems = signal(0);
  readonly isLoading = signal(false);
  readonly hasFetched = signal(false);
  readonly openDropdownId = signal<string | null>(null);

  // Pagination Signals
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  // Filters Signals
  readonly searchTerm = signal('');
  readonly selectedEstado = signal('TODOS');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Modals Signals
  readonly selectedDetailAgreement = signal<IAgreement | null>(null);

  ngOnInit(): void {
    this.loadAgreements();
  }

  ngOnDestroy(): void {
    this.clearSearchTimer();
  }

  loadAgreements(): void {
    this.clearSearchTimer();
    this.isLoading.set(true);
    this.openDropdownId.set(null);

    const params: IFindAllAgreementsParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    const estado = this.selectedEstado();
    if (estado && estado !== 'TODOS') {
      params.estado = estado;
    }

    const term = this.searchTerm().trim();
    if (term) {
      params.search = term;
    }

    this.agreementsService.getAgreements(params).subscribe({
      next: (res) => {
        this.agreements.set(res.data);
        this.totalItems.set(res.meta?.totalItems ?? res.data.length);
        this.isLoading.set(false);
        this.hasFetched.set(true);
      },
      error: () => {
        this.agreements.set([]);
        this.totalItems.set(0);
        this.isLoading.set(false);
        this.hasFetched.set(true);
      },
    });
  }

  onEstadoChange(estado: string): void {
    this.selectedEstado.set(estado);
    this.currentPage.set(1);
    this.loadAgreements();
  }

  limpiarFiltros(): void {
    this.searchTerm.set('');
    this.selectedEstado.set('TODOS');
    this.currentPage.set(1);
    this.loadAgreements();
  }

  // ---------- Buscador del listado ----------

  onSearchTermChange(term: string): void {
    this.searchTerm.set(term);
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.loadAgreements();
    }, SEARCH_DEBOUNCE_MS);
  }

  private clearSearchTimer(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadAgreements();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadAgreements();
  }

  toggleDropdown(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update((current) => (current === id ? null : id));
  }

  closeDropdowns(): void {
    if (this.openDropdownId() !== null) {
      this.openDropdownId.set(null);
    }
  }

  getProgressPercentage(agreement: IAgreement): number {
    const total = Number(agreement.deudaTotal);
    if (total <= 0) return 100;
    const pagado = Number(agreement.montoPagadoActual);
    return Math.min(100, Math.round((pagado / total) * 100));
  }

  getPaidInstallmentsCount(agreement: IAgreement): number {
    if (!agreement.cuotas) return 0;
    return agreement.cuotas.filter((c) => c.estado?.codigo === 'PAGADA' || c.pagoCompleto).length;
  }

  // Modals & Navigation
  openCreateModal(): void {
    this.router.navigate(['/app/Contratos/ConveniosDePago/new']);
  }

  openDetailModal(agreement: IAgreement): void {
    this.openDropdownId.set(null);
    this.agreementsService.getAgreementById(agreement.convenioId).subscribe({
      next: (full) => {
        this.selectedDetailAgreement.set(full);
      },
      error: () => {
        this.selectedDetailAgreement.set(agreement);
      },
    });
  }

  closeDetailModal(): void {
    this.selectedDetailAgreement.set(null);
  }

  onAgreementUpdated(): void {
    this.selectedDetailAgreement.set(null);
    this.loadAgreements();
  }

  downloadPdf(agreement: IAgreement): void {
    this.openDropdownId.set(null);
    this.agreementsService.getAgreementPdf(agreement.convenioId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `convenio-${agreement.convenioId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al descargar el PDF del convenio';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  // ---------- Exportaciones de Listado (PDF, Excel, CSV) ----------
  private readonly tableExportService = inject(TableExportService);

  exportToPdf(): void {
    const list = this.agreements();
    if (list.length === 0) return;

    this.tableExportService.exportToPdf({
      title: 'LISTADO DE CONVENIOS DE PAGO',
      fileName: `Convenios_Pago_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        {
          header: 'ID / Convenio',
          transform: (a) => (a as unknown as IAgreement).convenioId,
          width: 70,
        },
        {
          header: 'N° Guía',
          transform: (a) => (a as unknown as IAgreement).numeroGuia ?? '—',
          width: 65,
        },
        {
          header: 'Cliente',
          transform: (a) => (a as unknown as IAgreement).clienteNombre ?? '—',
          width: 120,
        },
        {
          header: 'Deuda Total',
          transform: (a) => `$${Number((a as unknown as IAgreement).deudaTotal || 0).toFixed(2)}`,
          width: 65,
          align: 'right',
        },
        {
          header: 'Cuotas',
          transform: (a) => `${(a as unknown as IAgreement).numeroCuotas}`,
          width: 45,
          align: 'center',
        },
        {
          header: 'Abono Inicial',
          transform: (a) => `$${Number((a as unknown as IAgreement).abonoInicial || 0).toFixed(2)}`,
          width: 70,
          align: 'right',
        },
        {
          header: 'Estado',
          transform: (a) =>
            (a as unknown as IAgreement).estado?.nombre ||
            (a as unknown as IAgreement).estado?.codigo ||
            '—',
          width: 60,
          align: 'center',
        },
      ],
      data: list as unknown as Record<string, unknown>[],
      summary: `Total convenios listados: ${list.length}`,
    });
  }

  exportToExcel(): void {
    const list = this.agreements();
    if (list.length === 0) return;

    this.tableExportService.exportToExcel({
      title: 'LISTADO DE CONVENIOS DE PAGO',
      fileName: `Convenios_Pago_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'ID Convenio', key: 'convenioId' },
        { header: 'N° Guía', transform: (a) => (a as unknown as IAgreement).numeroGuia ?? '—' },
        { header: 'Cliente', transform: (a) => (a as unknown as IAgreement).clienteNombre ?? '—' },
        {
          header: 'Deuda Total ($)',
          transform: (a) => Number((a as unknown as IAgreement).deudaTotal || 0),
        },
        { header: 'Cuotas Totales', key: 'numeroCuotas' },
        {
          header: 'Abono Inicial ($)',
          transform: (a) => Number((a as unknown as IAgreement).abonoInicial || 0),
        },
        { header: 'Meses Mora', key: 'mesesMoraActual' },
        {
          header: 'Estado',
          transform: (a) =>
            (a as unknown as IAgreement).estado?.nombre ||
            (a as unknown as IAgreement).estado?.codigo ||
            '—',
        },
      ],
      data: list as unknown as Record<string, unknown>[],
      summary: `Total convenios: ${list.length}`,
    });
  }

  exportToCsv(): void {
    const list = this.agreements();
    if (list.length === 0) return;

    this.tableExportService.exportToCsv({
      title: 'LISTADO DE CONVENIOS DE PAGO',
      fileName: `Convenios_Pago_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'ID Convenio', key: 'convenioId' },
        { header: 'N° Guía', transform: (a) => (a as unknown as IAgreement).numeroGuia ?? '—' },
        { header: 'Cliente', transform: (a) => (a as unknown as IAgreement).clienteNombre ?? '—' },
        {
          header: 'Deuda Total ($)',
          transform: (a) => Number((a as unknown as IAgreement).deudaTotal || 0),
        },
        { header: 'Cuotas Totales', key: 'numeroCuotas' },
        {
          header: 'Abono Inicial ($)',
          transform: (a) => Number((a as unknown as IAgreement).abonoInicial || 0),
        },
        { header: 'Meses Mora', key: 'mesesMoraActual' },
        {
          header: 'Estado',
          transform: (a) =>
            (a as unknown as IAgreement).estado?.nombre ||
            (a as unknown as IAgreement).estado?.codigo ||
            '—',
        },
      ],
      data: list as unknown as Record<string, unknown>[],
    });
  }
}
