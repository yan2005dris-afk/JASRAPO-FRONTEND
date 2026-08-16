import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiscountsService } from '../../services/discounts.service';
import {
  ICreateDiscountDto,
  IDiscount,
  IUpdateDiscountDto,
  TipoDescuento,
} from '../../interfaces/idiscount.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-discount-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './discount-form-modal.component.html',
  styleUrl: './discount-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscountFormModalComponent implements OnInit {
  private readonly discountsService = inject(DiscountsService);
  private readonly toastService = inject(ToastService);

  readonly discount = input<IDiscount | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  nombre = '';
  descripcion = '';
  tipoDescuento: TipoDescuento = 'TERCERA_EDAD';
  valor = 0;
  esPorcentaje = true;
  aplicaAutomatico = false;
  activo = true;
  isLoading = false;

  readonly tipoOptions: { value: TipoDescuento; label: string }[] = [
    { value: 'TERCERA_EDAD', label: 'Tercera Edad' },
    { value: 'DISCAPACIDAD', label: 'Discapacidad' },
    { value: 'INTERES_MORA', label: 'Interés por Mora' },
    { value: 'EXENCION_TASA', label: 'Exención de Tasa' },
    { value: 'CONVENIO', label: 'Convenio' },
    { value: 'OTROS', label: 'Otros' },
  ];

  ngOnInit(): void {
    const d = this.discount();
    if (d) {
      this.nombre = d.nombre;
      this.descripcion = d.descripcion || '';
      this.tipoDescuento = d.tipoDescuento as TipoDescuento;
      this.valor = Number(d.valor);
      this.esPorcentaje = d.esPorcentaje;
      this.aplicaAutomatico = d.aplicaAutomatico;
      this.activo = d.activo;
    }
  }

  setTipoValor(esPorc: boolean): void {
    this.esPorcentaje = esPorc;
  }

  get isFormValid(): boolean {
    return this.nombre.trim().length >= 3 && this.valor > 0;
  }

  submit(): void {
    if (!this.isFormValid || this.isLoading) return;

    this.isLoading = true;
    const isEdit = !!this.discount();

    if (isEdit) {
      const updateDto: IUpdateDiscountDto = {
        nombre: this.nombre.trim(),
        descripcion: this.descripcion.trim() || undefined,
        tipoDescuento: this.tipoDescuento,
        valor: Number(this.valor),
        esPorcentaje: this.esPorcentaje,
        aplicaAutomatico: this.aplicaAutomatico,
        activo: this.activo,
      };

      this.discountsService.updateDiscount(this.discount()!.id, updateDto).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Descuento actualizado exitosamente', 'success');
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al actualizar descuento';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
    } else {
      const createDto: ICreateDiscountDto = {
        nombre: this.nombre.trim(),
        descripcion: this.descripcion.trim() || undefined,
        tipoDescuento: this.tipoDescuento,
        valor: Number(this.valor),
        esPorcentaje: this.esPorcentaje,
        aplicaAutomatico: this.aplicaAutomatico,
      };

      this.discountsService.createDiscount(createDto).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Descuento creado exitosamente', 'success');
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al crear descuento';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
