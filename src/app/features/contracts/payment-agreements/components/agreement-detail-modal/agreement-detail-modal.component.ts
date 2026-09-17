import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentAgreementsService } from '../../services/payment-agreements.service';
import { IAgreement, IInstallment } from '../../interfaces/ipayment-agreement.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-agreement-detail-modal',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './agreement-detail-modal.component.html',
  styleUrl: './agreement-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgreementDetailModalComponent {
  private readonly agreementsService = inject(PaymentAgreementsService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

  readonly agreement = input.required<IAgreement>();
  readonly closed = output<void>();
  readonly updated = output<void>();

  isLoadingPdf = false;
  isCancelling = false;
  isActivating = false;

  /**
   * Un convenio se aprueba desde PREPARADO o PENDIENTE_ABONO. El backend
   * rechaza la transición desde ACTIVO, PAGADO y ANULADO, así que la acción
   * solo se ofrece cuando puede prosperar.
   */
  get canActivate(): boolean {
    const codigo = this.agreement().estado.codigo;
    return codigo === 'PREPARADO' || codigo === 'PENDIENTE_ABONO';
  }

  /** El convenio se pactó con un abono inicial que aún no consta como cobrado. */
  get hasPendingInitialPayment(): boolean {
    return this.agreement().estado.codigo === 'PENDIENTE_ABONO';
  }

  get paidInstallmentsCount(): number {
    if (!this.agreement().cuotas) return 0;
    return this.agreement().cuotas!.filter((c) => c.estado?.codigo === 'PAGADA' || c.pagoCompleto)
      .length;
  }

  get totalInstallmentsCount(): number {
    return this.agreement().cuotas?.length || this.agreement().numeroCuotas || 1;
  }

  get paymentProgressPercentage(): number {
    const total = this.agreement().deudaTotal;
    if (total <= 0) return 100;
    const pagado = this.agreement().montoPagadoActual;
    return Math.min(100, Math.round((pagado / total) * 100));
  }

  get remainingBalance(): number {
    return Math.max(0, this.agreement().deudaTotal - this.agreement().montoPagadoActual);
  }

  getCuotaBadgeClass(cuota: IInstallment): string {
    const estado = cuota.estado?.codigo;
    if (estado === 'PAGADA' || cuota.pagoCompleto) return 'badge-soft-success';
    if (estado === 'VENCIDA') return 'badge-soft-danger';
    return 'badge-soft-warning';
  }

  downloadPdf(): void {
    if (this.isLoadingPdf) return;

    this.isLoadingPdf = true;
    this.agreementsService.getAgreementPdf(this.agreement().convenioId).subscribe({
      next: (blob) => {
        this.isLoadingPdf = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `convenio-${this.agreement().convenioId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isLoadingPdf = false;
        const msg = err?.error?.message || 'Error al descargar el PDF del convenio';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  activateAgreement(): void {
    if (this.isActivating || !this.canActivate) return;

    const convenioId = this.agreement().convenioId;
    const aviso = this.hasPendingInitialPayment
      ? ` Este convenio se pactó con un abono inicial de $${this.agreement().abonoInicial} que aún no consta como cobrado.`
      : '';

    this.dialogService
      .confirm({
        title: 'Activar Convenio de Pago',
        message: `¿Aprobar y activar el convenio #${convenioId}? Las cuotas quedarán vigentes y la deuda pasará a cobrarse según el plan acordado.${aviso}`,
        confirmText: 'Activar Convenio',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.isActivating = true;
        this.agreementsService.updateAgreement(convenioId, { estado: 'ACTIVO' }).subscribe({
          next: () => {
            this.isActivating = false;
            this.toastService.show('Convenio activado exitosamente', 'success');
            this.updated.emit();
          },
          error: (err) => {
            this.isActivating = false;
            const msg = err?.error?.message || 'Error al activar convenio';
            this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
          },
        });
      });
  }

  cancelAgreement(): void {
    if (this.isCancelling) return;

    this.dialogService
      .confirm({
        title: 'Anular Convenio de Pago',
        message: `¿Estás seguro de anular el convenio #${this.agreement().convenioId}? La deuda pendiente volverá al estado moroso ordinario.`,
        confirmText: 'Anular Convenio',
        cancelText: 'Cancelar',
        isDanger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isCancelling = true;
          this.agreementsService.cancelAgreement(this.agreement().convenioId).subscribe({
            next: () => {
              this.isCancelling = false;
              this.toastService.show('Convenio anulado exitosamente', 'success');
              this.updated.emit();
            },
            error: (err) => {
              this.isCancelling = false;
              const msg = err?.error?.message || 'Error al anular convenio';
              this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
            },
          });
        }
      });
  }

  close(): void {
    this.closed.emit();
  }
}
