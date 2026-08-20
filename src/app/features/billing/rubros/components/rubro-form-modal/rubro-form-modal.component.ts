import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RubrosService } from '../../services/rubros.service';
import {
  CATALOGO_CODIGOS_SRI,
  ICodigoSriInfo,
  ICreateRubroDto,
  IRubro,
  ITarifaImpuesto,
  IUpdateRubroDto,
  TipoRubro,
} from '../../interfaces/irubro.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

import { PickerInputComponent } from '../../../../../shared/components/picker-input/picker-input.component';

@Component({
  selector: 'app-rubro-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerInputComponent],
  templateUrl: './rubro-form-modal.component.html',
  styleUrl: './rubro-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubroFormModalComponent implements OnInit {
  private readonly rubrosService = inject(RubrosService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly rubro = input<IRubro | null>(null);
  readonly initialCategoriaTarifaId = input<number | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  codigoSri = '';
  nombre = '';
  descripcion = '';
  precioUnitario = 0;
  tipoRubro: TipoRubro = 'FIJO';
  tarifaImpuestoId: number | null = null;
  categoriaTarifaId: number | null = null;
  activo = true;
  esAutomatico = false;
  isLoading = false;
  tarifasImpuesto: ITarifaImpuesto[] = [];
  readonly catalogoCodigosSri = CATALOGO_CODIGOS_SRI;

  // Picker States
  isSriPickerOpen = false;
  sriSearchQuery = '';
  isTipoPickerOpen = false;
  isTarifaPickerOpen = false;

  readonly tipoRubroOptions: { value: TipoRubro; label: string }[] = [
    { value: 'FIJO', label: 'Fijo (Cargo Fijo / Tasa)' },
    { value: 'VARIABLE', label: 'Variable (Consumo m³)' },
    { value: 'MULTA', label: 'Multa / Recargo' },
    { value: 'BIEN', label: 'Bien / Material' },
    { value: 'SERVICIO', label: 'Servicio / Instalación' },
    { value: 'OTRO', label: 'Otro' },
  ];

  get filteredCodigosSri(): readonly ICodigoSriInfo[] {
    const q = this.sriSearchQuery.toLowerCase().trim();
    if (!q) return this.catalogoCodigosSri;
    return this.catalogoCodigosSri.filter(
      (c: ICodigoSriInfo) =>
        c.codigo.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.nombreSugerido.toLowerCase().includes(q),
    );
  }

  get selectedConceptoLabel(): string {
    const match = this.catalogoCodigosSri.find((c: ICodigoSriInfo) => c.codigo === this.codigoSri);
    return match ? match.nombreSugerido : this.codigoSri ? `Concepto (${this.codigoSri})` : '';
  }

  get selectedCodigoSriLabel(): string {
    const match = this.catalogoCodigosSri.find((c: ICodigoSriInfo) => c.codigo === this.codigoSri);
    return match ? match.label : this.codigoSri ? `Código ${this.codigoSri}` : '';
  }

  get selectedTipoLabel(): string {
    const match = this.tipoRubroOptions.find((t) => t.value === this.tipoRubro);
    return match ? match.label : this.tipoRubro;
  }

  get selectedTarifaLabel(): string {
    const match = this.tarifasImpuesto.find((t) => t.id === this.tarifaImpuestoId);
    return match ? `${match.descripcion} (${match.porcentaje}%)` : '';
  }

  get currentPorcentajeIva(): number {
    const match = this.tarifasImpuesto.find((t) => t.id === this.tarifaImpuestoId);
    return match ? Number(match.porcentaje) : 0;
  }

  get valorIva(): number {
    const base = Number(this.precioUnitario) || 0;
    return (base * this.currentPorcentajeIva) / 100;
  }

  get precioTotalConIva(): number {
    const base = Number(this.precioUnitario) || 0;
    return base + this.valorIva;
  }

  setSriPickerOpen(open: boolean): void {
    this.isSriPickerOpen = open;
    if (open) {
      this.isTipoPickerOpen = false;
      this.isTarifaPickerOpen = false;
    }
    this.cdr.markForCheck();
  }

  setTipoPickerOpen(open: boolean): void {
    this.isTipoPickerOpen = open;
    if (open) {
      this.isSriPickerOpen = false;
      this.isTarifaPickerOpen = false;
    }
    this.cdr.markForCheck();
  }

  setTarifaPickerOpen(open: boolean): void {
    this.isTarifaPickerOpen = open;
    if (open) {
      this.isSriPickerOpen = false;
      this.isTipoPickerOpen = false;
    }
    this.cdr.markForCheck();
  }

  selectTipoRubro(opt: { value: TipoRubro; label: string }): void {
    this.tipoRubro = opt.value;
    this.isTipoPickerOpen = false;
    this.cdr.markForCheck();
  }

  selectTarifaImpuesto(t: ITarifaImpuesto): void {
    this.tarifaImpuestoId = t.id;
    this.isTarifaPickerOpen = false;
    this.cdr.markForCheck();
  }

  clearCodigoSri(): void {
    this.codigoSri = '';
    this.sriSearchQuery = '';
    this.isSriPickerOpen = false;
    this.cdr.markForCheck();
  }

  onCodigoSriSelected(codigo: string): void {
    this.codigoSri = codigo;
    const info = this.catalogoCodigosSri.find((c: ICodigoSriInfo) => c.codigo === codigo);
    if (info) {
      this.nombre = info.nombreSugerido;
      this.descripcion = info.descripcionSugerida;
      this.tipoRubro = info.tipoRubroSugerido;

      // Autoseleccionar la tarifa de IVA sugerida (0% vs 15%)
      if (this.tarifasImpuesto.length > 0) {
        const matchingTarifa = this.tarifasImpuesto.find(
          (t) => Number(t.porcentaje) === info.ivaSugeridoPct,
        );
        if (matchingTarifa) {
          this.tarifaImpuestoId = matchingTarifa.id;
        }
      }
    }
  }

  ngOnInit(): void {
    this.loadTarifasImpuesto();
    const r = this.rubro();
    if (r) {
      this.codigoSri = r.codigoSri || '';
      this.nombre = r.nombre;
      this.descripcion = r.descripcion || '';
      this.precioUnitario = Number(r.precioUnitario);
      this.tipoRubro = r.tipoRubro;
      this.tarifaImpuestoId = r.tarifaImpuestoId;
      this.categoriaTarifaId = r.categoriaTarifaId ?? null;
      this.activo = r.activo;
      this.esAutomatico = r.esAutomatico ?? false;
    } else {
      this.categoriaTarifaId = this.initialCategoriaTarifaId();
    }
  }

  private loadTarifasImpuesto(): void {
    this.rubrosService.getTarifasImpuesto().subscribe({
      next: (list) => {
        this.tarifasImpuesto = list;
        if (!this.tarifaImpuestoId && list.length > 0) {
          // Select default (IVA 0% or first)
          const iva0 = list.find((t) => t.porcentaje === 0 || t.codigoPorcentaje === '0');
          this.tarifaImpuestoId = iva0 ? iva0.id : list[0].id;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.tarifasImpuesto = [];
        this.cdr.markForCheck();
      },
    });
  }

  get isFormValid(): boolean {
    return (
      this.nombre.trim().length >= 2 &&
      this.descripcion.trim().length >= 2 &&
      this.precioUnitario >= 0 &&
      this.tarifaImpuestoId !== null &&
      this.tarifaImpuestoId > 0
    );
  }

  submit(): void {
    if (!this.isFormValid || this.isLoading) return;

    this.isLoading = true;
    const isEdit = !!this.rubro();

    if (isEdit) {
      const updateDto: IUpdateRubroDto = {
        codigoSri: this.codigoSri.trim() || undefined,
        nombre: this.nombre.trim(),
        descripcion: this.descripcion.trim(),
        precioUnitario: Number(this.precioUnitario),
        tipoRubro: this.tipoRubro,
        tarifaImpuestoId: Number(this.tarifaImpuestoId),
        categoriaTarifaId: this.categoriaTarifaId,
        activo: this.activo,
        esAutomatico: this.esAutomatico,
      };

      this.rubrosService.updateRubro(this.rubro()!.rubroId, updateDto).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Rubro actualizado exitosamente', 'success');
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al actualizar el rubro';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
          this.cdr.markForCheck();
        },
      });
    } else {
      const createDto: ICreateRubroDto = {
        codigoSri: this.codigoSri.trim() || undefined,
        nombre: this.nombre.trim(),
        descripcion: this.descripcion.trim(),
        precioUnitario: Number(this.precioUnitario),
        tipoRubro: this.tipoRubro,
        tarifaImpuestoId: Number(this.tarifaImpuestoId),
        categoriaTarifaId: this.categoriaTarifaId,
        activo: this.activo,
        esAutomatico: false,
      };

      this.rubrosService.createRubro(createDto).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Rubro creado exitosamente', 'success');
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al crear el rubro';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
          this.cdr.markForCheck();
        },
      });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
