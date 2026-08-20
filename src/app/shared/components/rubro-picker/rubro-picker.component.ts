import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableSkeletonComponent } from '../table-skeleton/table-skeleton.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { PaymentsService } from '../../../features/billing/payments/services/payments.service';
import type { IRubro } from '../../../features/billing/payments/interfaces/ipayments.interface';

@Component({
  selector: 'app-rubro-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TableSkeletonComponent, PaginationComponent],
  templateUrl: './rubro-picker.component.html',
  styleUrl: './rubro-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubroPickerComponent {
  private readonly paymentsService = inject(PaymentsService);

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly open = input(false);
  readonly title = input('Buscar Rubro del Catálogo');

  readonly rubroSelected = output<IRubro>();
  readonly closed = output<void>();

  readonly searchTerm = signal('');
  readonly rubros = signal<IRubro[]>([]);
  readonly isSearching = signal(false);
  readonly searchError = signal('');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.searchTerm.set('');
        this.searchError.set('');
        this.currentPage.set(1);
        this.buscarRubros();
        setTimeout(() => this.searchInput()?.nativeElement.focus(), 150);
      }
    });
  }

  // Paginación
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.buscarRubros(), 300);
  }

  buscarRubros(): void {
    this.isSearching.set(true);
    this.searchError.set('');

    this.paymentsService
      .getRubros({
        activo: true,
        search: this.searchTerm().trim() || undefined,
        page: this.currentPage(),
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.rubros.set(res.data || []);
          this.totalItems.set(res.meta?.total || (res.data ? res.data.length : 0));
          this.isSearching.set(false);
        },
        error: (err) => {
          this.rubros.set([]);
          this.totalItems.set(0);
          this.isSearching.set(false);
          this.searchError.set(err?.error?.message || 'Error al buscar rubros en el catálogo');
        },
      });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.buscarRubros();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.buscarRubros();
  }

  seleccionar(rubro: IRubro): void {
    this.rubroSelected.emit(rubro);
    this.cerrar();
  }

  cerrar(): void {
    this.closed.emit();
  }
}
