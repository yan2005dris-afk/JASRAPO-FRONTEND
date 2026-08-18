import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IBatch } from '../../interfaces/ibatch.interface';
import { IPreInvoice } from '../../../pre-invoices/interfaces/ipre-invoice.interface';
import { BatchesService } from '../../services/batches.service';
import { PreInvoicesService } from '../../../pre-invoices/services/pre-invoices.service';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { BatchSendEmailModalComponent } from '../../components/batch-send-email-modal/batch-send-email-modal.component';

@Component({
  selector: 'app-batch-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StatusBadgeComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    BatchSendEmailModalComponent,
  ],
  templateUrl: './batch-detail.component.html',
  styleUrl: './batch-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly batchesService = inject(BatchesService);
  private readonly preInvoicesService = inject(PreInvoicesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  loteId!: number;
  batch: IBatch | null = null;
  isLoading = true;

  // Prefacturas Table
  prefacturas: IPreInvoice[] = [];
  isLoadingPrefacturas = false;
  searchQuery = '';
  selectedIds = new Set<number>();

  // Processing state
  processingPreInvoiceId: number | null = null;
  isBulkApproving = false;
  isSendEmailModalOpen = false;
  openDropdownId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/Facturacion/EnvioDeFacturacion']);
      return;
    }

    this.loteId = Number(idParam);
    this.loadBatchDetail();
  }

  loadBatchDetail(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.batchesService.getBatchById(this.loteId).subscribe({
      next: (data) => {
        this.batch = data;
        this.prefacturas = data.prefacturas ?? [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('No se pudo cargar la información del lote');
        this.cdr.markForCheck();
      },
    });
  }

  get pendingReviewCount(): number {
    return this.prefacturas.filter((pf) => pf.estado === 'EN_REVISION').length;
  }

  get generatedCount(): number {
    return this.prefacturas.filter((pf) => pf.estado === 'GENERADA').length;
  }

  get filteredPrefacturas(): IPreInvoice[] {
    const term = this.searchQuery.trim().toLowerCase();
    if (!term) return this.prefacturas;
    return this.prefacturas.filter(
      (pf) =>
        String(pf.prefacturaId).includes(term) ||
        String(pf.contratoId).includes(term) ||
        (pf.clienteNombre?.toLowerCase().includes(term) ?? false) ||
        (pf.clienteIdentificacion?.toLowerCase().includes(term) ?? false),
    );
  }

  onSearch(): void {
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.cdr.markForCheck();
  }

  // ---------- Selección ----------

  get isAllSelected(): boolean {
    return (
      this.filteredPrefacturas.length > 0 &&
      this.filteredPrefacturas.every((pf) => this.selectedIds.has(pf.prefacturaId))
    );
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  toggleSelectAll(): void {
    const visible = this.filteredPrefacturas;
    if (this.isAllSelected) {
      for (const pf of visible) {
        this.selectedIds.delete(pf.prefacturaId);
      }
    } else {
      for (const pf of visible) {
        this.selectedIds.add(pf.prefacturaId);
      }
    }
    this.cdr.markForCheck();
  }

  toggleSelect(pf: IPreInvoice): void {
    if (this.selectedIds.has(pf.prefacturaId)) {
      this.selectedIds.delete(pf.prefacturaId);
    } else {
      this.selectedIds.add(pf.prefacturaId);
    }
    this.cdr.markForCheck();
  }

  get selectedPendingCount(): number {
    return this.prefacturas.filter(
      (pf) =>
        this.selectedIds.has(pf.prefacturaId) && pf.estado === 'EN_REVISION',
    ).length;
  }

  get selectedGeneratedCount(): number {
    return this.prefacturas.filter(
      (pf) =>
        this.selectedIds.has(pf.prefacturaId) && pf.estado === 'GENERADA',
    ).length;
  }

  approveSelected(): void {
    const pendingList = this.prefacturas.filter(
      (pf) => this.selectedIds.has(pf.prefacturaId) && pf.estado === 'EN_REVISION',
    );
    if (pendingList.length === 0 || this.isBulkApproving) return;

    this.dialogService
      .confirm({
        title: 'Aprobar prefacturas seleccionadas',
        message: `¿Deseas aprobar ${pendingList.length} prefacturas seleccionadas?`,
        confirmText: 'Sí, aprobar',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.isBulkApproving = true;
        this.cdr.markForCheck();

        let completed = 0;
        let errors = 0;
        for (const pf of pendingList) {
          this.preInvoicesService
            .updatePreInvoiceState(pf.prefacturaId, { action: 'APROBADA' })
            .subscribe({
              next: () => {
                pf.estado = 'APROBADA';
                this.selectedIds.delete(pf.prefacturaId);
                completed++;
                if (completed + errors === pendingList.length) {
                  this.finishBulkApproval(completed, errors);
                }
              },
              error: () => {
                errors++;
                if (completed + errors === pendingList.length) {
                  this.finishBulkApproval(completed, errors);
                }
              },
            });
        }
      });
  }

  openRouteDetail(): void {
    const rutaId = this.batch?.rutaId;
    if (!rutaId) return;
    this.router.navigate(['/app/Contratos/RutasDeLectura', rutaId]);
  }

  // ---------- Pasar a revisión (GENERADA -> EN_REVISION) ----------

  moveToReview(pf: IPreInvoice): void {
    if (this.processingPreInvoiceId !== null) return;
    this.openDropdownId = null;

    this.preInvoicesService
      .updatePreInvoiceState(pf.prefacturaId, { action: 'EN_REVISION' })
      .subscribe({
        next: () => {
          pf.estado = 'EN_REVISION';
          this.processingPreInvoiceId = null;
          this.toastService.show('Prefactura enviada a revisión', 'success');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.processingPreInvoiceId = null;
          const msg = err?.error?.message || 'Error al enviar a revisión';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
          this.cdr.markForCheck();
        },
      });
  }

  moveSelectedToReview(): void {
    const list = this.prefacturas.filter(
      (pf) => this.selectedIds.has(pf.prefacturaId) && pf.estado === 'GENERADA',
    );
    if (list.length === 0 || this.isBulkApproving) return;

    this.dialogService
      .confirm({
        title: 'Pasar a revisión',
        message: `¿Deseas enviar ${list.length} prefacturas seleccionadas a revisión?`,
        confirmText: 'Sí, enviar',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.isBulkApproving = true;
        this.cdr.markForCheck();

        let completed = 0;
        let errors = 0;
        for (const pf of list) {
          this.preInvoicesService
            .updatePreInvoiceState(pf.prefacturaId, { action: 'EN_REVISION' })
            .subscribe({
              next: () => {
                pf.estado = 'EN_REVISION';
                this.selectedIds.delete(pf.prefacturaId);
                completed++;
                if (completed + errors === list.length) {
                  this.finishBulkReview(completed, errors);
                }
              },
              error: () => {
                errors++;
                if (completed + errors === list.length) {
                  this.finishBulkReview(completed, errors);
                }
              },
            });
        }
      });
  }

  moveAllToReview(): void {
    const list = this.prefacturas.filter((pf) => pf.estado === 'GENERADA');
    if (list.length === 0 || this.isBulkApproving) return;

    this.dialogService
      .confirm({
        title: 'Pasar todas a revisión',
        message: `¿Deseas enviar las ${list.length} prefacturas generadas a revisión?`,
        confirmText: 'Sí, enviar todas',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.isBulkApproving = true;
        this.cdr.markForCheck();

        let completed = 0;
        let errors = 0;
        for (const pf of list) {
          this.preInvoicesService
            .updatePreInvoiceState(pf.prefacturaId, { action: 'EN_REVISION' })
            .subscribe({
              next: () => {
                pf.estado = 'EN_REVISION';
                completed++;
                if (completed + errors === list.length) {
                  this.finishBulkReview(completed, errors);
                }
              },
              error: () => {
                errors++;
                if (completed + errors === list.length) {
                  this.finishBulkReview(completed, errors);
                }
              },
            });
        }
      });
  }

  private finishBulkReview(completed: number, errors: number): void {
    this.isBulkApproving = false;
    if (errors === 0) {
      this.toastService.show(`Se enviaron ${completed} prefacturas a revisión`, 'success');
    } else {
      this.toastService.warning(`Se enviaron ${completed} a revisión. Hubo ${errors} errores.`);
    }
    this.cdr.markForCheck();
  }

  openPreInvoiceDetail(pf: IPreInvoice): void {
    this.openDropdownId = null;
    this.router.navigate(['/app/Facturacion/GeneracionPlanilla', pf.prefacturaId]);
  }

  toggleDropdown(id: number): void {
    this.openDropdownId = this.openDropdownId === id ? null : id;
    this.cdr.markForCheck();
  }

  // ---------- Acciones de aprobación ----------

  approvePreInvoice(pf: IPreInvoice): void {
    if (this.processingPreInvoiceId !== null) return;
    this.openDropdownId = null;

    this.dialogService
      .confirm({
        title: 'Aprobar Prefactura',
        message: `¿Estás seguro de aprobar la prefactura #${pf.prefacturaId} por un total de $${pf.totalPagar.toFixed(2)}?`,
        confirmText: 'Aprobar',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((approved) => {
        if (!approved) return;
        this.processingPreInvoiceId = pf.prefacturaId;
        this.cdr.markForCheck();

        this.preInvoicesService
          .updatePreInvoiceState(pf.prefacturaId, { action: 'APROBADA' })
          .subscribe({
            next: () => {
              pf.estado = 'APROBADA';
              this.processingPreInvoiceId = null;
              this.toastService.show('Prefactura aprobada exitosamente', 'success');
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.processingPreInvoiceId = null;
              const msg = err?.error?.message || 'Error al aprobar prefactura';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
              this.cdr.markForCheck();
            },
          });
      });
  }

  approveAllPending(): void {
    const pendingList = this.prefacturas.filter(
      (pf) => pf.estado === 'EN_REVISION',
    );
    if (pendingList.length === 0 || this.isBulkApproving) return;

    this.dialogService
      .confirm({
        title: 'Aprobar todas las prefacturas',
        message: `¿Deseas aprobar ${pendingList.length} prefacturas pendientes de este lote?`,
        confirmText: 'Sí, aprobar todas',
        cancelText: 'Cancelar',
        isDanger: false,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.isBulkApproving = true;
        this.cdr.markForCheck();

        let completed = 0;
        let errors = 0;
        for (const pf of pendingList) {
          this.preInvoicesService
            .updatePreInvoiceState(pf.prefacturaId, { action: 'APROBADA' })
            .subscribe({
              next: () => {
                pf.estado = 'APROBADA';
                completed++;
                if (completed + errors === pendingList.length) {
                  this.finishBulkApproval(completed, errors);
                }
              },
              error: () => {
                errors++;
                if (completed + errors === pendingList.length) {
                  this.finishBulkApproval(completed, errors);
                }
              },
            });
        }
      });
  }

  private finishBulkApproval(completed: number, errors: number): void {
    this.isBulkApproving = false;
    if (errors === 0) {
      this.toastService.show(`Se aprobaron ${completed} prefacturas correctamente`, 'success');
    } else {
      this.toastService.warning(`Se aprobaron ${completed} prefacturas. Hubo ${errors} errores.`);
    }
    this.cdr.markForCheck();
  }

  // ---------- Envío masivo ----------

  openSendEmailModal(): void {
    this.isSendEmailModalOpen = true;
    this.cdr.markForCheck();
  }

  closeSendEmailModal(): void {
    this.isSendEmailModalOpen = false;
    this.cdr.markForCheck();
  }

  onEmailsSent(): void {
    this.isSendEmailModalOpen = false;
    this.cdr.markForCheck();
  }
}