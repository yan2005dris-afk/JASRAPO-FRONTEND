import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentAgreementsService } from './services/payment-agreements.service';
import { IAgreement, IFindAllAgreementsParams } from './interfaces/ipayment-agreement.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TableExportService } from '../../../shared/services/table-export.service';
import {
  DropdownComponent,
  DropdownItem,
} from '../../../shared/components/dropdown/dropdown.component';
import { CreateAgreementModalComponent } from './components/create-agreement-modal/create-agreement-modal.component';
import { AgreementDetailModalComponent } from './components/agreement-detail-modal/agreement-detail-modal.component';

/** Espera tras la última tecla antes de consultar el backend. */
const SEARCH_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-payment-agreements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    PaginationComponent,
    CreateAgreementModalComponent,
    AgreementDetailModalComponent,
    DropdownComponent,
  ],
  templateUrl: './payment-agreements.html',
  styleUrl: './payment-agreements.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class PaymentAgreementsComponent implements OnInit, OnDestroy {
  private readonly agreementsService = inject(PaymentAgreementsService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

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

  // List State
  agreements: IAgreement[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  searchTerm = '';
  selectedEstado = 'TODOS';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Modals
  isCreateModalOpen = false;
  selectedDetailAgreement: IAgreement | null = null;

  ngOnInit(): void {
    this.loadAgreements();
  }

  ngOnDestroy(): void {
    this.clearSearchTimer();
  }

  loadAgreements(): void {
    this.clearSearchTimer();
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IFindAllAgreementsParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.selectedEstado && this.selectedEstado !== 'TODOS') {
      params.estado = this.selectedEstado;
    }

    const term = this.searchTerm.trim();
    if (term) {
      params.search = term;
    }

    this.agreementsService.getAgreements(params).subscribe({
      next: (res) => {
        this.agreements = res.data;
        this.totalItems = res.meta?.totalItems ?? res.data.length;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.agreements = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
    });
  }

  onEstadoChange(estado: string): void {
    this.selectedEstado = estado;
    this.currentPage = 1;
    this.loadAgreements();
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.selectedEstado = 'TODOS';
    this.currentPage = 1;
    this.loadAgreements();
  }

  // ---------- Buscador del listado ----------

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
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
    this.currentPage = page;
    this.loadAgreements();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadAgreements();
  }

  toggleDropdown(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === id ? null : id;
    this.cdr.markForCheck();
  }

  closeDropdowns(): void {
    if (this.openDropdownId !== null) {
      this.openDropdownId = null;
      this.cdr.markForCheck();
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

  // Modals
  openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.cdr.markForCheck();
  }

  onAgreementCreated(): void {
    this.isCreateModalOpen = false;
    this.loadAgreements();
  }

  openDetailModal(agreement: IAgreement): void {
    this.openDropdownId = null;
    this.agreementsService.getAgreementById(agreement.convenioId).subscribe({
      next: (full) => {
        this.selectedDetailAgreement = full;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedDetailAgreement = agreement;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetailModal(): void {
    this.selectedDetailAgreement = null;
    this.cdr.markForCheck();
  }

  onAgreementUpdated(): void {
    this.selectedDetailAgreement = null;
    this.loadAgreements();
  }

  downloadPdf(agreement: IAgreement): void {
    this.openDropdownId = null;
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
    if (this.agreements.length === 0) return;

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
      data: this.agreements as unknown as Record<string, unknown>[],
      summary: `Total convenios listados: ${this.agreements.length}`,
    });
  }

  exportToExcel(): void {
    if (this.agreements.length === 0) return;

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
      data: this.agreements as unknown as Record<string, unknown>[],
      summary: `Total convenios: ${this.agreements.length}`,
    });
  }

  exportToCsv(): void {
    if (this.agreements.length === 0) return;

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
      data: this.agreements as unknown as Record<string, unknown>[],
    });
  }
}
