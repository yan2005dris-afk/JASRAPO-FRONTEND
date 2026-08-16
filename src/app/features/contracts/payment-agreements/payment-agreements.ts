import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentAgreementsService } from './services/payment-agreements.service';
import {
  IAgreement,
  IFindAllAgreementsParams,
} from './interfaces/ipayment-agreement.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { CreateAgreementModalComponent } from './components/create-agreement-modal/create-agreement-modal.component';
import { AgreementDetailModalComponent } from './components/agreement-detail-modal/agreement-detail-modal.component';

@Component({
  selector: 'app-payment-agreements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    CreateAgreementModalComponent,
    AgreementDetailModalComponent,
  ],
  templateUrl: './payment-agreements.html',
  styleUrl: './payment-agreements.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class PaymentAgreementsComponent implements OnInit {
  private readonly agreementsService = inject(PaymentAgreementsService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

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
  filterSearch = '';
  filterContratoId = '';

  // Modals
  isCreateModalOpen = false;
  selectedDetailAgreement: IAgreement | null = null;

  ngOnInit(): void {
    this.loadAgreements();
  }

  loadAgreements(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    const params: IFindAllAgreementsParams = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.filterSearch.trim()) {
      params.search = this.filterSearch.trim();
    }
    if (this.filterContratoId.trim()) {
      params.contratoId = this.filterContratoId.trim();
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

  limpiarFiltros(): void {
    this.filterSearch = '';
    this.filterContratoId = '';
    this.currentPage = 1;
    this.loadAgreements();
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
    return agreement.cuotas.filter(
      (c) => c.estado?.codigo === 'PAGADA' || c.pagoCompleto,
    ).length;
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
}
