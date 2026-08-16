import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreInvoicesService } from './services/pre-invoices.service';
import {
  IFindAllPreInvoicesParams,
  IPreInvoice,
  IPreInvoiceStateOption,
} from './interfaces/ipre-invoice.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PreInvoiceDetailModalComponent } from './components/pre-invoice-detail-modal/pre-invoice-detail-modal.component';
import { SendEmailModalComponent } from './components/send-email-modal/send-email-modal.component';
import { RejectModalComponent } from './components/reject-modal/reject-modal.component';
import { PdfViewerModalComponent } from './components/pdf-viewer-modal/pdf-viewer-modal.component';

@Component({
  selector: 'app-pre-invoices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    PreInvoiceDetailModalComponent,
    SendEmailModalComponent,
    RejectModalComponent,
    PdfViewerModalComponent,
  ],
  templateUrl: './pre-invoices.html',
  styleUrl: './pre-invoices.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class PreInvoicesComponent implements OnInit {
  private readonly preInvoicesService = inject(PreInvoicesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // List State
  preInvoices: IPreInvoice[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: number | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Workqueue Filter (default: EN_REVISION)
  activeStatusFilter = 'EN_REVISION';
  filterIdentificacion = '';
  filterContratoId = '';
  filterLoteId: number | null = null;
  filterPeriodoId: number | null = null;

  // Catalogs
  statesCatalog: IPreInvoiceStateOption[] = [];

  // Modals State
  selectedDetailPreInvoice: IPreInvoice | null = null;
  selectedEmailPreInvoice: IPreInvoice | null = null;
  selectedRejectPreInvoice: IPreInvoice | null = null;
  selectedPdfPreInvoice: IPreInvoice | null = null;
  pdfBlob: Blob | null = null;
  isLoadingPdf = false;

  ngOnInit(): void {
    this.loadStatesCatalog();
    this.loadPreInvoices();
  }

  loadStatesCatalog(): void {
    this.preInvoicesService.getPreInvoiceStates().subscribe({
      next: (states) => {
        this.statesCatalog = states;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading pre-invoice states catalog', err);
      },
    });
  }

  loadPreInvoices(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IFindAllPreInvoicesParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.activeStatusFilter) {
      params.estado = this.activeStatusFilter;
    }
    if (this.filterIdentificacion.trim()) {
      params.identificacion = this.filterIdentificacion.trim();
    }
    if (this.filterContratoId.trim()) {
      params.contratoId = this.filterContratoId.trim();
    }
    if (this.filterLoteId) {
      params.loteId = this.filterLoteId;
    }
    if (this.filterPeriodoId) {
      params.periodoId = this.filterPeriodoId;
    }

    this.preInvoicesService.getPreInvoices(params).subscribe({
      next: (res) => {
        this.preInvoices = res.data;
        this.totalItems = res.meta?.totalItems ?? res.data.length;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.preInvoices = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.hasFetched = true;
        this.cdr.markForCheck();
      },
    });
  }

  setStatusFilter(status: string): void {
    this.activeStatusFilter = status;
    this.currentPage = 1;
    this.loadPreInvoices();
  }

  limpiarFiltros(): void {
    this.activeStatusFilter = 'EN_REVISION';
    this.filterIdentificacion = '';
    this.filterContratoId = '';
    this.filterLoteId = null;
    this.filterPeriodoId = null;
    this.currentPage = 1;
    this.loadPreInvoices();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadPreInvoices();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadPreInvoices();
  }

  toggleDropdown(id: number, event: MouseEvent): void {
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

  // Actions
  aprobarPreInvoice(preInvoice: IPreInvoice): void {
    this.openDropdownId = null;
    this.dialogService
      .confirm({
        title: 'Aprobar Prefactura',
        message: `¿Estás seguro de aprobar la prefactura #${preInvoice.prefacturaId} por un total de $${preInvoice.totalPagar.toFixed(2)}?`,
        confirmText: 'Aprobar',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((approved) => {
        if (approved) {
          this.isLoading = true;
          this.preInvoicesService
            .updatePreInvoiceState(preInvoice.prefacturaId, { action: 'APROBADA' })
            .subscribe({
              next: () => {
                this.isLoading = false;
                this.toastService.show('Prefactura aprobada exitosamente', 'success');
                if (this.selectedDetailPreInvoice?.prefacturaId === preInvoice.prefacturaId) {
                  this.selectedDetailPreInvoice = null;
                }
                this.loadPreInvoices();
              },
              error: (err) => {
                this.isLoading = false;
                const msg = err?.error?.message || 'Error al aprobar prefactura';
                this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
                this.cdr.markForCheck();
              },
            });
        }
      });
  }

  openRejectModal(preInvoice: IPreInvoice): void {
    this.openDropdownId = null;
    this.selectedRejectPreInvoice = preInvoice;
    this.cdr.markForCheck();
  }

  closeRejectModal(): void {
    this.selectedRejectPreInvoice = null;
    this.cdr.markForCheck();
  }

  onPreInvoiceRejected(): void {
    this.selectedRejectPreInvoice = null;
    if (this.selectedDetailPreInvoice) {
      this.selectedDetailPreInvoice = null;
    }
    this.loadPreInvoices();
  }

  openDetailModal(preInvoice: IPreInvoice): void {
    this.openDropdownId = null;
    this.preInvoicesService.getPreInvoiceById(preInvoice.prefacturaId).subscribe({
      next: (full) => {
        this.selectedDetailPreInvoice = full;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedDetailPreInvoice = preInvoice;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetailModal(): void {
    this.selectedDetailPreInvoice = null;
    this.cdr.markForCheck();
  }

  openEmailModal(preInvoice: IPreInvoice): void {
    this.openDropdownId = null;
    this.selectedEmailPreInvoice = preInvoice;
    this.cdr.markForCheck();
  }

  closeEmailModal(): void {
    this.selectedEmailPreInvoice = null;
    this.cdr.markForCheck();
  }

  openPdfModal(preInvoice: IPreInvoice): void {
    this.openDropdownId = null;
    this.selectedPdfPreInvoice = preInvoice;
    this.pdfBlob = null;
    this.isLoadingPdf = true;
    this.cdr.markForCheck();

    this.preInvoicesService.getPreInvoicePdf(preInvoice.prefacturaId).subscribe({
      next: (blob) => {
        this.pdfBlob = blob;
        this.isLoadingPdf = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoadingPdf = false;
        this.selectedPdfPreInvoice = null;
        const msg = err?.error?.message || 'Error al generar el PDF de la prefactura';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  closePdfModal(): void {
    this.selectedPdfPreInvoice = null;
    this.pdfBlob = null;
    this.cdr.markForCheck();
  }
}
