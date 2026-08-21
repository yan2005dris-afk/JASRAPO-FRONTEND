import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  untracked,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../pagination/pagination.component';
import { TableSkeletonComponent } from '../table-skeleton/table-skeleton.component';

import { ContractsService } from '../../../features/contracts/service-contracts/services/contracts.service';
import type {
  IContract,
  ISearchContractsParams,
} from '../../../features/contracts/service-contracts/interfaces/icontract.interface';

@Component({
  selector: 'app-contract-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TableSkeletonComponent],
  templateUrl: './contract-picker.component.html',
  styleUrl: './contract-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractPickerComponent {
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly open = input(false);
  readonly title = input('Buscar Contrato Activo');
  readonly estado = input<string | undefined>(undefined);

  readonly contractSelected = output<IContract>();
  readonly closed = output<void>();

  private readonly contractsService = inject(ContractsService);

  // Buscador de contratos
  readonly searchTerm = signal('');
  readonly searchResults = signal<IContract[]>([]);
  readonly isSearching = signal(false);

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen) {
        untracked(() => {
          this.searchTerm.set('');
          this.searchError.set('');
          this.currentPage.set(1);
          this.buscarContratos();
          setTimeout(() => this.searchInput()?.nativeElement.focus(), 150);
        });
      }
    });
  }
  readonly searchError = signal('');
  readonly searchPerformed = signal(false);

  // Paginación
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  static formatClientName(cliente: IContract['cliente']): string {
    if (cliente.razonSocial) {
      return cliente.razonSocial;
    }
    return `${cliente.nombres} ${cliente.apellidos}`.trim();
  }

  formatClientName(cliente: IContract['cliente']): string {
    return ContractPickerComponent.formatClientName(cliente);
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.buscarContratos(), 400);
  }

  buscarContratos(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }

    const term = this.searchTerm().trim();

    this.isSearching.set(true);
    this.searchError.set('');
    const params: ISearchContractsParams = {
      search: term || undefined,
      page: this.currentPage(),
      limit: this.pageSize(),
    };
    const estadoVal = this.estado();
    if (estadoVal) {
      params.estado = estadoVal;
    }
    this.contractsService.getContracts(params).subscribe({
      next: (res) => {
        this.searchResults.set(res.data || []);
        this.totalItems.set(res.meta?.total || (res.data ? res.data.length : 0));
        this.searchPerformed.set(true);
        this.isSearching.set(false);
      },
      error: (err) => {
        this.searchResults.set([]);
        this.totalItems.set(0);
        this.searchPerformed.set(true);
        this.searchError.set(this.getErrorMessage(err, 'No se pudieron buscar los contratos'));
        this.isSearching.set(false);
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.buscarContratos();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.buscarContratos();
  }

  cerrar(): void {
    this.closed.emit();
  }

  seleccionar(contract: IContract): void {
    this.contractSelected.emit(contract);
    this.cerrar();
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const apiErr = (err as { error?: { message?: string } }).error;
      if (apiErr?.message) {
        return apiErr.message;
      }
    }
    return fallback;
  }
}
