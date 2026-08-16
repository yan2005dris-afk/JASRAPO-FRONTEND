import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BatchesService } from './services/batches.service';
import { IBatch, IBatchStateOption } from './interfaces/ibatch.interface';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { GenerateBatchModalComponent } from './components/generate-batch-modal/generate-batch-modal.component';
import { BatchDetailModalComponent } from './components/batch-detail-modal/batch-detail-modal.component';
import { BatchSendEmailModalComponent } from './components/batch-send-email-modal/batch-send-email-modal.component';

@Component({
  selector: 'app-batches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    PaginationComponent,
    GenerateBatchModalComponent,
    BatchDetailModalComponent,
    BatchSendEmailModalComponent,
  ],
  templateUrl: './batches.html',
  styleUrl: './batches.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class BatchesComponent implements OnInit {
  private readonly batchesService = inject(BatchesService);
  private readonly cdr = inject(ChangeDetectorRef);

  // List State
  batches: IBatch[] = [];
  totalItems = 0;
  isLoading = false;
  hasFetched = false;
  openDropdownId: number | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // States
  statesCatalog: IBatchStateOption[] = [];

  // Modals
  isGenerateModalOpen = false;
  selectedDetailBatch: IBatch | null = null;
  selectedEmailBatch: IBatch | null = null;

  ngOnInit(): void {
    this.loadStates();
    this.loadBatches();
  }

  loadStates(): void {
    this.batchesService.getBatchStates().subscribe({
      next: (states) => {
        this.statesCatalog = states;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading batch states', err);
      },
    });
  }

  loadBatches(): void {
    this.isLoading = true;
    this.openDropdownId = null;

    this.batchesService
      .getBatches({ page: this.currentPage, limit: this.pageSize })
      .subscribe({
        next: (res) => {
          this.batches = res.data;
          this.totalItems = res.meta?.totalItems ?? res.data.length;
          this.isLoading = false;
          this.hasFetched = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.batches = [];
          this.totalItems = 0;
          this.isLoading = false;
          this.hasFetched = true;
          this.cdr.markForCheck();
        },
      });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadBatches();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadBatches();
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

  // Modals
  openGenerateModal(): void {
    this.isGenerateModalOpen = true;
    this.cdr.markForCheck();
  }

  closeGenerateModal(): void {
    this.isGenerateModalOpen = false;
    this.cdr.markForCheck();
  }

  onBatchGenerated(): void {
    this.isGenerateModalOpen = false;
    this.loadBatches();
  }

  openDetailModal(batch: IBatch): void {
    this.openDropdownId = null;
    this.batchesService.getBatchById(batch.loteId).subscribe({
      next: (full) => {
        this.selectedDetailBatch = full;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedDetailBatch = batch;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetailModal(): void {
    this.selectedDetailBatch = null;
    this.cdr.markForCheck();
  }

  openEmailModal(batch: IBatch): void {
    this.openDropdownId = null;
    this.selectedEmailBatch = batch;
    this.cdr.markForCheck();
  }

  closeEmailModal(): void {
    this.selectedEmailBatch = null;
    this.cdr.markForCheck();
  }

  onEmailsSent(): void {
    this.selectedEmailBatch = null;
    if (this.selectedDetailBatch) {
      this.selectedDetailBatch = null;
    }
    this.loadBatches();
  }
}
