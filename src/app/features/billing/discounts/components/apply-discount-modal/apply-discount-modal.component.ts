import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiscountsService } from '../../services/discounts.service';
import { PreInvoicesService } from '../../../pre-invoices/services/pre-invoices.service';
import { IDiscount, IApplyDiscountToPreinvoiceDto } from '../../interfaces/idiscount.interface';
import { IPreInvoice } from '../../../pre-invoices/interfaces/ipre-invoice.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-apply-discount-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './apply-discount-modal.component.html',
  styleUrl: './apply-discount-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplyDiscountModalComponent {
  private readonly discountsService = inject(DiscountsService);
  private readonly preInvoicesService = inject(PreInvoicesService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly discount = input.required<IDiscount>();
  readonly applied = output<void>();
  readonly closed = output<void>();

  prefacturaIdInput: number | null = null;
  foundPreInvoice: IPreInvoice | null = null;
  isSearchingPreInvoice = false;
  searchError = '';

  motivo = '';
  autorizadoPor = '';
  usarMontoPersonalizado = false;
  montoCustom: number | null = null;
  isLoading = false;

  searchPreInvoice(): void {
    if (!this.prefacturaIdInput || this.prefacturaIdInput <= 0) return;

    this.isSearchingPreInvoice = true;
    this.searchError = '';
    this.foundPreInvoice = null;
    this.cdr.markForCheck();

    this.preInvoicesService.getPreInvoiceById(this.prefacturaIdInput).subscribe({
      next: (pi) => {
        this.foundPreInvoice = pi;
        this.isSearchingPreInvoice = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.searchError = `No se encontró la prefactura #${this.prefacturaIdInput}.`;
        this.isSearchingPreInvoice = false;
        this.cdr.markForCheck();
      },
    });
  }

  get calculatedDiscount(): number {
    if (!this.foundPreInvoice) return 0;
    if (this.usarMontoPersonalizado && this.montoCustom && this.montoCustom > 0) {
      return Number(this.montoCustom);
    }
    const d = this.discount();
    if (d.esPorcentaje) {
      return (Number(this.foundPreInvoice.totalPagar) * Number(d.valor)) / 100;
    }
    return Number(d.valor);
  }

  get estimatedTotalPagar(): number {
    if (!this.foundPreInvoice) return 0;
    return Math.max(0, Number(this.foundPreInvoice.totalPagar) - this.calculatedDiscount);
  }

  get isValid(): boolean {
    if (!this.foundPreInvoice) return false;
    if (this.usarMontoPersonalizado && (!this.montoCustom || this.montoCustom <= 0)) return false;
    return true;
  }

  submitApply(): void {
    if (!this.isValid || !this.foundPreInvoice || this.isLoading) return;

    const dto: IApplyDiscountToPreinvoiceDto = {
      catalogoDescuentoId: this.discount().id,
      motivo: this.motivo.trim() || undefined,
      autorizadoPor: this.autorizadoPor.trim() || undefined,
      montoCustom:
        this.usarMontoPersonalizado && this.montoCustom ? Number(this.montoCustom) : undefined,
    };

    this.isLoading = true;
    this.discountsService
      .applyDiscountToPreinvoice(this.foundPreInvoice.prefacturaId, dto)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.toastService.show(
            res.message || 'Descuento aplicado correctamente a la prefactura',
            'success',
          );
          this.applied.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al aplicar el descuento';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
          this.cdr.markForCheck();
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
