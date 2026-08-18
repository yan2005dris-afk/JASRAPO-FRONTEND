import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentsService } from '../../services/payments.service';
import type {
  ICobroPuntualItem,
  ICreateCobroPuntualDto,
  IRubro,
} from '../../interfaces/ipayments.interface';

@Component({
  selector: 'app-cobro-puntual-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open) {
      <div class="modal-backdrop fade show"></div>
      <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content shadow-lg border-0 rounded-4">
            <!-- Header -->
            <div class="modal-header border-bottom bg-light">
              <div>
                <h5 class="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i class="bi bi-cart-plus text-primary"></i>
                  Cobro Puntual
                </h5>
                <p class="text-muted small mb-0 mt-1">Seleccione rubros a cobrar y ajuste cantidades.</p>
              </div>
              <button
                type="button"
                class="btn-close shadow-none"
                aria-label="Cerrar"
                (click)="cerrar()"
                [disabled]="isSubmitting()"
              ></button>
            </div>

            <!-- Body -->
            <div class="modal-body p-4 bg-white">
              <div class="row g-4 h-100">
                <!-- Left: Catalog -->
                <div class="col-md-5 d-flex flex-column border-end h-100">
                  <h6 class="fw-bold mb-3 text-secondary">Catálogo de Rubros</h6>
                  
                  <div class="input-group mb-3">
                    <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
                    <input
                      type="text"
                      class="form-control shadow-none"
                      placeholder="Buscar rubro por nombre..."
                      [ngModel]="searchTerm()"
                      (ngModelChange)="onSearchInput($event)"
                    />
                  </div>

                  @if (isSearching()) {
                    <div class="text-center py-4 text-muted">
                      <div class="spinner-border spinner-border-sm text-primary"></div>
                      <span class="small ms-2">Buscando...</span>
                    </div>
                  } @else {
                    <div class="rubros-list flex-grow-1 overflow-auto" style="max-height: 400px;">
                      @for (rubro of rubros(); track rubro.rubroId) {
                        <div class="card mb-2 rubro-card cursor-pointer border shadow-sm" (click)="addRubro(rubro)">
                          <div class="card-body p-3 d-flex justify-content-between align-items-center">
                            <div>
                              <div class="fw-bold text-dark small mb-1">{{ rubro.nombre }}</div>
                              <div class="text-muted" style="font-size: 0.75rem;">{{ rubro.descripcion }}</div>
                            </div>
                            <div class="text-end ms-2">
                              <div class="fw-bold text-primary">{{ rubro.precioUnitario | currency }}</div>
                              <span class="badge badge-soft-secondary" style="font-size: 0.65rem">
                                {{ rubro.tarifaImpuesto ? rubro.tarifaImpuesto.porcentaje + '% IVA' : 'Sin IVA' }}
                              </span>
                            </div>
                          </div>
                        </div>
                      }
                      
                      @if (rubros().length === 0) {
                        <div class="text-center py-4 text-muted small bg-light rounded">
                          No se encontraron rubros.
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Right: Selected Items -->
                <div class="col-md-7 d-flex flex-column h-100">
                  <h6 class="fw-bold mb-3 text-secondary">Items a Cobrar</h6>
                  
                  <div class="table-responsive flex-grow-1" style="max-height: 400px;">
                    <table class="table table-sm align-middle" style="font-size: 0.85rem">
                      <thead class="table-light">
                        <tr>
                          <th>Rubro</th>
                          <th style="width: 80px" class="text-center">Cant.</th>
                          <th class="text-end">P.Unit</th>
                          <th class="text-end">IVA</th>
                          <th class="text-end">Total</th>
                          <th style="width: 40px"></th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of items(); track item.rubroId; let idx = $index) {
                          <tr>
                            <td>
                              <div class="fw-bold text-dark">{{ item.rubroNombre }}</div>
                              <input
                                type="text"
                                class="form-control form-control-sm mt-1 shadow-none"
                                placeholder="Descripción..."
                                [ngModel]="item.descripcion"
                                (ngModelChange)="updateDescripcion(idx, $event)"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                class="form-control form-control-sm text-center shadow-none"
                                [ngModel]="item.cantidad"
                                (ngModelChange)="updateCantidad(idx, $event)"
                              />
                            </td>
                            <td class="text-end">{{ item.precioUnitario | currency }}</td>
                            <td class="text-end">{{ item.iva | currency }}</td>
                            <td class="text-end fw-bold">{{ item.total | currency }}</td>
                            <td class="text-center">
                              <button class="btn btn-sm text-danger shadow-none p-1" (click)="removeItem(idx)">
                                <i class="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        }
                        @if (items().length === 0) {
                          <tr>
                            <td colspan="6" class="text-center py-5 text-muted bg-light">
                              <i class="bi bi-cart-x fs-3 d-block mb-2"></i>
                              Seleccione rubros del catálogo a la izquierda.
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <!-- Totals -->
                  <div class="mt-3 bg-light p-3 rounded border">
                    <div class="d-flex justify-content-between mb-1 small">
                      <span class="text-muted">Subtotal:</span>
                      <span class="fw-medium">{{ subtotal() | currency }}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2 small">
                      <span class="text-muted">IVA:</span>
                      <span class="fw-medium">{{ iva() | currency }}</span>
                    </div>
                    <div class="d-flex justify-content-between pt-2 border-top">
                      <span class="fw-bold">Total a Cobrar:</span>
                      <span class="fw-bold fs-5 text-primary">{{ total() | currency }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer bg-light border-top">
              @if (error()) {
                <div class="text-danger small fw-medium me-auto">
                  <i class="bi bi-exclamation-triangle-fill"></i> {{ error() }}
                </div>
              }
              <button
                type="button"
                class="btn btn-outline-secondary"
                (click)="cerrar()"
                [disabled]="isSubmitting()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn-primary d-flex align-items-center gap-2"
                (click)="registrarCobro()"
                [disabled]="isSubmitting() || items().length === 0"
              >
                @if (isSubmitting()) {
                  <span class="spinner-border spinner-border-sm" role="status"></span>
                  Procesando...
                } @else {
                  <i class="bi bi-check-circle"></i> Registrar Cobro
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .rubro-card {
      transition: all 0.2s ease-in-out;
    }
    .rubro-card:hover {
      transform: translateY(-2px);
      border-color: var(--bs-primary) !important;
    }
    .cursor-pointer {
      cursor: pointer;
    }
    .badge-soft-secondary {
      background-color: #f3f4f6;
      color: #4b5563;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CobroPuntualModalComponent {
  @Input({ required: true }) set open(value: boolean) {
    this._open = value;
    if (value) {
      this.loadRubros();
      this.items.set([]);
      this.error.set('');
    }
  }
  get open(): boolean {
    return this._open;
  }
  private _open = false;

  @Input() contratoId!: string;
  @Input() clienteId!: string;
  @Input() fechaPago!: string;
  @Input() banco?: string;
  @Input() tarjetaCredito?: string;
  @Input() numeroOperacion?: string;
  @Input() observaciones?: string;

  @Output() cobroPuntualCreated = new EventEmitter<{ pagoId: number }>();
  @Output() closed = new EventEmitter<void>();

  private readonly paymentsService = inject(PaymentsService);

  readonly rubros = signal<IRubro[]>([]);
  readonly searchTerm = signal('');
  readonly items = signal<ICobroPuntualItem[]>([]);
  readonly isSearching = signal(false);
  readonly isSubmitting = signal(false);
  readonly error = signal('');

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly subtotal = computed(() => this.items().reduce((acc, item) => acc + item.subtotal, 0));
  readonly iva = computed(() => this.items().reduce((acc, item) => acc + item.iva, 0));
  readonly total = computed(() => this.items().reduce((acc, item) => acc + item.total, 0));

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadRubros(), 300);
  }

  loadRubros(): void {
    this.isSearching.set(true);
    this.paymentsService.getRubros({ activo: true, search: this.searchTerm(), limit: 50 }).subscribe({
      next: (res) => {
        this.rubros.set(res.data);
        this.isSearching.set(false);
      },
      error: () => {
        this.rubros.set([]);
        this.isSearching.set(false);
      }
    });
  }

  addRubro(rubro: IRubro): void {
    const current = this.items();
    const existingIdx = current.findIndex(i => i.rubroId === rubro.rubroId);
    
    if (existingIdx >= 0) {
      this.updateCantidad(existingIdx, current[existingIdx].cantidad + 1);
    } else {
      const pIva = rubro.tarifaImpuesto ? Number(rubro.tarifaImpuesto.porcentaje) : 0;
      const subtotal = Number(rubro.precioUnitario);
      const iva = (subtotal * pIva) / 100;
      
      this.items.update(items => [...items, {
        rubroId: rubro.rubroId,
        rubroNombre: rubro.nombre,
        descripcion: '',
        cantidad: 1,
        precioUnitario: Number(rubro.precioUnitario),
        porcentajeIva: pIva,
        subtotal,
        iva,
        total: subtotal + iva
      }]);
    }
  }

  updateCantidad(idx: number, cantidad: number): void {
    if (cantidad < 1) cantidad = 1;
    this.items.update(items => {
      const newItems = [...items];
      const item = { ...newItems[idx] };
      item.cantidad = cantidad;
      item.subtotal = item.precioUnitario * cantidad;
      item.iva = (item.subtotal * item.porcentajeIva) / 100;
      item.total = item.subtotal + item.iva;
      newItems[idx] = item;
      return newItems;
    });
  }

  updateDescripcion(idx: number, desc: string): void {
    this.items.update(items => {
      const newItems = [...items];
      newItems[idx] = { ...newItems[idx], descripcion: desc };
      return newItems;
    });
  }

  removeItem(idx: number): void {
    this.items.update(items => items.filter((_, i) => i !== idx));
  }

  cerrar(): void {
    this.closed.emit();
  }

  registrarCobro(): void {
    if (this.items().length === 0) return;

    this.isSubmitting.set(true);
    this.error.set('');

    const dto: ICreateCobroPuntualDto = {
      clienteId: this.clienteId,
      contratoId: this.contratoId,
      fechaPago: this.fechaPago,
      items: this.items().map(i => ({
        rubroId: i.rubroId,
        cantidad: i.cantidad,
        ...(i.descripcion ? { descripcion: i.descripcion } : {})
      })),
      montoTotalRecibido: this.total(),
      banco: this.banco,
      tarjetaCredito: this.tarjetaCredito,
      numeroOperacion: this.numeroOperacion,
      observaciones: this.observaciones
    };

    this.paymentsService.createCobroPuntual(dto).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.cobroPuntualCreated.emit({ pagoId: Number(res.pagoId) });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message || 'Error al registrar cobro puntual';
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    });
  }
}
