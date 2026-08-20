import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  input,
  output,
  effect,
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
    @if (open()) {
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
                <p class="text-muted small mb-0 mt-1">
                  Seleccione rubros a cobrar y ajuste cantidades.
                </p>
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
                    <span class="input-group-text bg-white"
                      ><i class="bi bi-search text-muted"></i
                    ></span>
                    <input
                      type="text"
                      class="form-control"
                      placeholder="Buscar por nombre o código..."
                      [ngModel]="searchTerm()"
                      (ngModelChange)="onSearchInput($event)"
                    />
                  </div>

                  <div class="overflow-y-auto flex-grow-1 pe-2" style="max-height: 450px;">
                    @if (isSearching()) {
                      <div class="text-center py-4 text-muted">
                        <span class="spinner-border spinner-border-sm" role="status"></span>
                        Cargando catálogo...
                      </div>
                    } @else if (rubros().length === 0) {
                      <div class="text-center py-4 text-muted">No se encontraron rubros.</div>
                    } @else {
                      <div class="d-flex flex-column gap-2">
                        @for (rubro of rubros(); track rubro.rubroId) {
                          <div
                            class="card border p-3 cursor-pointer rubro-card"
                            (click)="addRubro(rubro)"
                            (keydown.enter)="addRubro(rubro)"
                            tabindex="0"
                            role="button"
                          >
                            <div class="d-flex justify-content-between align-items-start">
                              <div>
                                <span class="fw-bold text-dark d-block">{{ rubro.nombre }}</span>
                                <small class="text-muted">{{ rubro.descripcion }}</small>
                                <div class="mt-1">
                                  <span class="badge badge-soft-secondary me-1">{{
                                    rubro.tipoRubro
                                  }}</span>
                                </div>
                              </div>
                              <div class="text-end">
                                <span class="fw-bold text-primary fs-6">{{
                                  rubro.precioUnitario | currency
                                }}</span>
                                @if (rubro.tarifaImpuesto) {
                                  <small class="text-muted d-block"
                                    >IVA {{ rubro.tarifaImpuesto.porcentaje }}%</small
                                  >
                                }
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Right: Selected Items -->
                <div class="col-md-7 d-flex flex-column h-100">
                  <h6 class="fw-bold mb-3 text-secondary">Conceptos Seleccionados</h6>

                  <div class="overflow-y-auto flex-grow-1 pe-2" style="max-height: 380px;">
                    @if (items().length === 0) {
                      <div
                        class="d-flex flex-column align-items-center justify-content-center h-100 text-muted py-5"
                      >
                        <i class="bi bi-basket3 fs-1 mb-2"></i>
                        <span>No hay rubros seleccionados.</span>
                        <small>Haga clic en un rubro de la izquierda para agregarlo.</small>
                      </div>
                    } @else {
                      <table class="table align-middle">
                        <thead class="table-light">
                          <tr>
                            <th>Rubro</th>
                            <th style="width: 100px;">Cant.</th>
                            <th class="text-end" style="width: 110px;">P. Unit.</th>
                            <th class="text-end" style="width: 110px;">Total</th>
                            <th style="width: 40px;"></th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (item of items(); track item.rubroId; let idx = $index) {
                            <tr>
                              <td>
                                <span class="fw-medium text-dark d-block">{{
                                  item.rubroNombre
                                }}</span>
                                <input
                                  type="text"
                                  class="form-control form-control-sm mt-1"
                                  placeholder="Nota/Descripción personalizada..."
                                  [ngModel]="item.descripcion"
                                  (ngModelChange)="updateDescripcion(idx, $event)"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  class="form-control form-control-sm text-center"
                                  min="1"
                                  [ngModel]="item.cantidad"
                                  (ngModelChange)="updateCantidad(idx, $event)"
                                />
                              </td>
                              <td class="text-end">
                                {{ item.precioUnitario | currency }}
                                @if (item.porcentajeIva > 0) {
                                  <small class="text-muted d-block"
                                    >+{{ item.porcentajeIva }}% IVA</small
                                  >
                                }
                              </td>
                              <td class="text-end fw-bold">
                                {{ item.total | currency }}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  class="btn btn-sm btn-link text-danger p-0"
                                  (click)="removeItem(idx)"
                                  title="Quitar"
                                >
                                  <i class="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    }
                  </div>

                  <!-- Summary Section -->
                  <div class="border-top pt-3 mt-auto">
                    <div class="d-flex justify-content-between mb-1 text-muted">
                      <span>Subtotal:</span>
                      <span>{{ subtotal() | currency }}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2 text-muted">
                      <span>IVA:</span>
                      <span>{{ iva() | currency }}</span>
                    </div>
                    <div
                      class="d-flex justify-content-between fs-5 fw-bold text-dark border-top pt-2"
                    >
                      <span>Total a Cobrar:</span>
                      <span class="text-primary">{{ total() | currency }}</span>
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
  styles: [
    `
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CobroPuntualModalComponent {
  readonly open = input<boolean>(false);

  readonly contratoId = input.required<string>();
  readonly clienteId = input.required<string>();
  readonly fechaPago = input.required<string>();
  readonly banco = input<string | undefined>(undefined);
  readonly tarjetaCredito = input<string | undefined>(undefined);
  readonly numeroOperacion = input<string | undefined>(undefined);
  readonly observaciones = input<string | undefined>(undefined);

  readonly cobroPuntualCreated = output<{ pagoId: number }>();
  readonly closed = output<void>();

  private readonly paymentsService = inject(PaymentsService);

  readonly rubros = signal<IRubro[]>([]);
  readonly searchTerm = signal('');
  readonly items = signal<ICobroPuntualItem[]>([]);
  readonly isSearching = signal(false);
  readonly isSubmitting = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.loadRubros();
        this.items.set([]);
        this.error.set('');
      }
    });
  }

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
    this.paymentsService
      .getRubros({ activo: true, search: this.searchTerm(), limit: 50 })
      .subscribe({
        next: (res) => {
          this.rubros.set(res.data);
          this.isSearching.set(false);
        },
        error: () => {
          this.rubros.set([]);
          this.isSearching.set(false);
        },
      });
  }

  addRubro(rubro: IRubro): void {
    const current = this.items();
    const existingIdx = current.findIndex((i) => i.rubroId === rubro.rubroId);

    if (existingIdx >= 0) {
      this.updateCantidad(existingIdx, current[existingIdx].cantidad + 1);
    } else {
      const pIva = rubro.tarifaImpuesto ? Number(rubro.tarifaImpuesto.porcentaje) : 0;
      const subtotal = Number(rubro.precioUnitario);
      const iva = (subtotal * pIva) / 100;

      this.items.update((items) => [
        ...items,
        {
          rubroId: rubro.rubroId,
          rubroNombre: rubro.nombre,
          descripcion: '',
          cantidad: 1,
          precioUnitario: Number(rubro.precioUnitario),
          porcentajeIva: pIva,
          subtotal,
          iva,
          total: subtotal + iva,
        },
      ]);
    }
  }

  updateCantidad(idx: number, cantidad: number): void {
    if (cantidad < 1) cantidad = 1;
    this.items.update((items) => {
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
    this.items.update((items) => {
      const newItems = [...items];
      newItems[idx] = { ...newItems[idx], descripcion: desc };
      return newItems;
    });
  }

  removeItem(idx: number): void {
    this.items.update((items) => items.filter((_, i) => i !== idx));
  }

  cerrar(): void {
    this.closed.emit();
  }

  registrarCobro(): void {
    if (this.items().length === 0) return;

    this.isSubmitting.set(true);
    this.error.set('');

    const dto: ICreateCobroPuntualDto = {
      clienteId: this.clienteId(),
      contratoId: this.contratoId(),
      fechaPago: this.fechaPago(),
      items: this.items().map((i) => ({
        rubroId: i.rubroId,
        cantidad: i.cantidad,
        ...(i.descripcion ? { descripcion: i.descripcion } : {}),
      })),
      montoTotalRecibido: this.total(),
      banco: this.banco(),
      tarjetaCredito: this.tarjetaCredito(),
      numeroOperacion: this.numeroOperacion(),
      observaciones: this.observaciones(),
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
      },
    });
  }
}
