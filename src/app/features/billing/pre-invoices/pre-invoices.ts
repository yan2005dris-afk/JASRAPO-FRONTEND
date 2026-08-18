import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PreInvoicesService } from './services/pre-invoices.service';
import {
  IFindAllPreInvoicesParams,
  IPreInvoice,
  IPreInvoiceStateOption,
} from './interfaces/ipre-invoice.interface';
import { BatchesService } from '../batches/services/batches.service';
import { IBatch } from '../batches/interfaces/ibatch.interface';
import { ReadingRoutesService } from '../../contracts/reading-routes/services/reading-routes.service';
import type { IContract } from '../../contracts/service-contracts/interfaces/icontract.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ContractPickerComponent } from '../../../shared/components/contract-picker/contract-picker.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { SendEmailModalComponent } from './components/send-email-modal/send-email-modal.component';
import { RejectModalComponent } from './components/reject-modal/reject-modal.component';
import { PdfViewerModalComponent } from './components/pdf-viewer-modal/pdf-viewer-modal.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-pre-invoices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    SendEmailModalComponent,
    RejectModalComponent,
    PdfViewerModalComponent,
    ContractPickerComponent,
    DatePickerComponent,
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
  private readonly router = inject(Router);
  private readonly batchesService = inject(BatchesService);
  private readonly routesService = inject(ReadingRoutesService);
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

  // Workqueue Filter (default: all)
  activeStatusFilter = '';
  filterIdentificacion = '';
  filterContratoId: number | null = null;
  filterLoteId: number | null = null;
  filterPeriodoId: number | null = null;
  filterFechaDesde: string = '';
  filterFechaHasta: string = '';
  showMoreFilters = false;

  // Catalogs
  statesCatalog: IPreInvoiceStateOption[] = [];
  lotesCatalog: IBatch[] = [];
  periodosCatalog: { periodoId: number; nombre?: string; estado: string }[] = [];

  // Contrato picker (mismo patrón que Convenios de Pago)
  isContractPickerOpen = false;
  selectedContractNumber = '';
  selectedContractName = '';

  // Template helpers
  loteLabel(l: IBatch): string {
    return `Lote #${l.loteId} · ${l.periodoRel?.nombre || 'Período ' + l.periodoId}`;
  }

  periodoLabel(p: { periodoId: number; nombre?: string }): string {
    return p.nombre || `Período ${p.periodoId}`;
  }

  // Modals State
  selectedEmailPreInvoice: IPreInvoice | null = null;
  selectedRejectPreInvoice: IPreInvoice | null = null;
  selectedPdfPreInvoice: IPreInvoice | null = null;
  pdfBlob: Blob | null = null;
  isLoadingPdf = false;

  ngOnInit(): void {
    this.loadStatesCatalog();
    this.loadCatalogs();
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

  loadCatalogs(): void {
    this.batchesService.getBatches({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.lotesCatalog = res.data;
        this.cdr.markForCheck();
      },
      error: () => {
        this.lotesCatalog = [];
        this.cdr.markForCheck();
      },
    });

    this.routesService.getPeriods().subscribe({
      next: (periods) => {
        this.periodosCatalog = periods;
        this.cdr.markForCheck();
      },
      error: () => {
        this.periodosCatalog = [];
        this.cdr.markForCheck();
      },
    });
  }

  // ---------- Buscador de contratos ----------

  abrirBuscadorContratos(): void {
    this.isContractPickerOpen = true;
    this.cdr.markForCheck();
  }

  onContractSelected(contract: IContract): void {
    this.filterContratoId = Number(contract.contratoId);
    this.selectedContractNumber = contract.numeroGuia;
    this.selectedContractName = ContractPickerComponent.formatClientName(contract.cliente);
    this.isContractPickerOpen = false;
    this.currentPage = 1;
    this.loadPreInvoices();
    this.cdr.markForCheck();
  }

  onContractPickerClosed(): void {
    this.isContractPickerOpen = false;
    this.cdr.markForCheck();
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
    if (this.filterContratoId) {
      params.contratoId = String(this.filterContratoId);
    }
    if (this.filterLoteId) {
      params.loteId = this.filterLoteId;
    }
    if (this.filterPeriodoId) {
      params.periodoId = this.filterPeriodoId;
    }
    if (this.filterFechaDesde) {
      params.fechaDesde = this.filterFechaDesde;
    }
    if (this.filterFechaHasta) {
      params.fechaHasta = this.filterFechaHasta;
    }

    this.preInvoicesService.getPreInvoices(params).subscribe({
      next: (res) => {
        this.preInvoices = res.data;
        this.totalItems = res.meta?.total ?? res.data.length;
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
    this.activeStatusFilter = '';
    this.filterIdentificacion = '';
    this.filterContratoId = null;
    this.selectedContractNumber = '';
    this.selectedContractName = '';
    this.filterLoteId = null;
    this.filterPeriodoId = null;
    this.filterFechaDesde = '';
    this.filterFechaHasta = '';
    this.showMoreFilters = false;
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

  moverARevision(preInvoice: IPreInvoice): void {
    this.openDropdownId = null;
    this.dialogService
      .confirm({
        title: 'Pasar a revisión',
        message: `¿Estás seguro de enviar a revisión la prefactura #${preInvoice.prefacturaId}?`,
        confirmText: 'Enviar',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.isLoading = true;
        this.preInvoicesService
          .updatePreInvoiceState(preInvoice.prefacturaId, { action: 'EN_REVISION' })
          .subscribe({
            next: () => {
              this.isLoading = false;
              this.toastService.show('Prefactura enviada a revisión', 'success');
              this.loadPreInvoices();
            },
            error: (err) => {
              this.isLoading = false;
              const msg = err?.error?.message || 'Error al enviar a revisión';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
              this.cdr.markForCheck();
            },
          });
      });
  }

  closeRejectModal(): void {
    this.selectedRejectPreInvoice = null;
    this.cdr.markForCheck();
  }

  onPreInvoiceRejected(): void {
    this.selectedRejectPreInvoice = null;
    this.loadPreInvoices();
  }

  openDetailModal(preInvoice: IPreInvoice): void {
    this.openDropdownId = null;
    this.router.navigate(['/app/Facturacion/GeneracionPlanilla', preInvoice.prefacturaId]);
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
