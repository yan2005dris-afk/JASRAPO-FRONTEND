import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContractsService } from '../../../features/contracts/service-contracts/services/contracts.service';
import type { IContract } from '../../../features/contracts/service-contracts/interfaces/icontract.interface';

@Component({
  selector: 'app-contract-picker',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contract-picker.component.html',
  styleUrl: './contract-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractPickerComponent {
  @Input({ required: true }) open = false;
  @Input() title = 'Buscar Contrato';

  @Output() contractSelected = new EventEmitter<IContract>();
  @Output() closed = new EventEmitter<void>();

  private readonly contractsService = inject(ContractsService);

  // Buscador de contratos
  readonly searchTerm = signal('');
  readonly searchResults = signal<IContract[]>([]);
  readonly isSearching = signal(false);
  readonly searchError = signal('');
  readonly searchPerformed = signal(false);
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
    if (!term) {
      this.searchResults.set([]);
      this.searchError.set('');
      this.searchPerformed.set(false);
      return;
    }

    this.isSearching.set(true);
    this.searchError.set('');
    this.contractsService.getContracts({ search: term, page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.searchResults.set(res.data);
        this.searchPerformed.set(true);
        this.isSearching.set(false);
      },
      error: (err) => {
        this.searchResults.set([]);
        this.searchPerformed.set(true);
        this.searchError.set(this.getErrorMessage(err, 'No se pudieron buscar los contratos'));
        this.isSearching.set(false);
      },
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  seleccionar(contract: IContract): void {
    this.contractSelected.emit(contract);
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const inner = (err as { error?: unknown }).error;
      if (inner && typeof inner === 'object' && 'message' in inner) {
        const message = (inner as { message?: unknown }).message;
        if (typeof message === 'string' && message) {
          return message;
        }
      }
    }
    return fallback;
  }
}