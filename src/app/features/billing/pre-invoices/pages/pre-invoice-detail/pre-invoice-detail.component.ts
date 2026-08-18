import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IPreInvoice } from '../../interfaces/ipre-invoice.interface';
import { PreInvoicesService } from '../../services/pre-invoices.service';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { SendEmailModalComponent } from '../../components/send-email-modal/send-email-modal.component';
import { RejectModalComponent } from '../../components/reject-modal/reject-modal.component';
import { PdfViewerModalComponent } from '../../components/pdf-viewer-modal/pdf-viewer-modal.component';

@Component({
  selector: 'app-pre-invoice-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StatusBadgeComponent,
    SendEmailModalComponent,
    RejectModalComponent,
    PdfViewerModalComponent,
  ],
  templateUrl: './pre-invoice-detail.component.html',
  styleUrl: './pre-invoice-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreInvoiceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preInvoicesService = inject(PreInvoicesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  prefacturaId!: number;
  preInvoice: IPreInvoice | null = null;
  isLoading = true;

  // Sub-modals
  isEmailModalOpen = false;
  isRejectModalOpen = false;
  selectedPdfPreInvoice: IPreInvoice | null = null;
  pdfBlob: Blob | null = null;
  isLoadingPdf = false;
  isApproving = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/Facturacion/GeneracionPlanilla']);
      return;
    }

    this.prefacturaId = Number(idParam);
    this.loadPreInvoiceDetail();
  }

  loadPreInvoiceDetail(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.preInvoicesService.getPreInvoiceById(this.prefacturaId).subscribe({
      next: (data) => {
        this.preInvoice = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('No se pudo cargar el detalle de la prefactura');
        this.cdr.markForCheck();
      },
    });
  }

  goToBatch(): void {
    const loteId = this.preInvoice?.loteId;
    if (!loteId) return;
    this.router.navigate(['/app/Facturacion/EnvioDeFacturacion', loteId]);
  }

  // ---------- Acciones ----------

  moveToReview(): void {
    const pf = this.preInvoice;
    if (!pf || this.isApproving) return;
    this.isApproving = true;
    this.cdr.markForCheck();

    this.preInvoicesService
      .updatePreInvoiceState(pf.prefacturaId, { action: 'EN_REVISION' })
      .subscribe({
        next: () => {
          this.isApproving = false;
          this.toastService.show('Prefactura enviada a revisión', 'success');
          this.loadPreInvoiceDetail();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isApproving = false;
          const msg = err?.error?.message || 'Error al enviar a revisión';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
          this.cdr.markForCheck();
        },
      });
  }

  approvePreInvoice(): void {
    const pf = this.preInvoice;
    if (!pf || this.isApproving) return;

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
        this.isApproving = true;
        this.cdr.markForCheck();

        this.preInvoicesService
          .updatePreInvoiceState(pf.prefacturaId, { action: 'APROBADA' })
          .subscribe({
            next: () => {
              this.isApproving = false;
              this.toastService.show('Prefactura aprobada exitosamente', 'success');
              this.loadPreInvoiceDetail();
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.isApproving = false;
              const msg = err?.error?.message || 'Error al aprobar prefactura';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
              this.cdr.markForCheck();
            },
          });
      });
  }

  openRejectModal(): void {
    if (!this.preInvoice) return;
    this.isRejectModalOpen = true;
    this.cdr.markForCheck();
  }

  closeRejectModal(): void {
    this.isRejectModalOpen = false;
    this.cdr.markForCheck();
  }

  onPreInvoiceRejected(): void {
    this.isRejectModalOpen = false;
    this.loadPreInvoiceDetail();
  }

  openEmailModal(): void {
    if (!this.preInvoice) return;
    this.isEmailModalOpen = true;
    this.cdr.markForCheck();
  }

  closeEmailModal(): void {
    this.isEmailModalOpen = false;
    this.cdr.markForCheck();
  }

  onEmailsSent(): void {
    this.isEmailModalOpen = false;
    this.cdr.markForCheck();
  }

  openPdfModal(): void {
    const pf = this.preInvoice;
    if (!pf) return;

    this.selectedPdfPreInvoice = pf;
    this.pdfBlob = null;
    this.isLoadingPdf = true;
    this.cdr.markForCheck();

    this.preInvoicesService.getPreInvoicePdf(pf.prefacturaId).subscribe({
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