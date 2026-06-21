import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContractsService } from './services/contracts.service';
import { IContract, IContractState, IHistorialMedidor } from './interfaces/icontract.interface';
import { ServiceContractFormComponent } from './components/service-contract-form/service-contract-form.component';
import { ContractEditComponent } from './components/contract-edit/contract-edit.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-service-contracts',
  standalone: true,
  imports: [FormsModule, ServiceContractFormComponent, ContractEditComponent, PaginationComponent],
  templateUrl: './service-contracts.html',
  styleUrl: './service-contracts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ServiceContractsComponent implements OnInit {
  private readonly contractsService = inject(ContractsService);

  // Menú de acciones por fila (tres puntitos)
  readonly openDropdownId = signal<string | null>(null);

  // Modal de edición de contrato
  readonly contractToEdit = signal<IContract | null>(null);

  toggleDropdown(contratoId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update((id) => (id === contratoId ? null : contratoId));
  }

  closeDropdowns(): void {
    this.openDropdownId.set(null);
  }

  /** Abre el modal de edición del contrato. */
  editContract(contract: IContract): void {
    this.closeDropdowns();
    this.contractToEdit.set(contract);
  }

  closeEdit(): void {
    this.contractToEdit.set(null);
  }

  onContractUpdated(): void {
    this.closeEdit();
    this.loadContracts();
  }

  // Estado del listado
  readonly contracts = signal<IContract[]>([]);
  readonly totalItems = signal(0);
  readonly isLoading = signal(false);
  readonly hasFetched = signal(false);

  // Búsqueda por número de guía (se manda al backend)
  readonly searchTerm = signal('');

  // Paginación (servidor)
  readonly pageSizeOptions = [5, 10, 15];
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);

  // Catálogo de estados de contrato (del backend)
  readonly contractStates = signal<IContractState[]>([]);

  // Modal del formulario de registro de contrato
  readonly isFormOpen = signal(false);

  ngOnInit(): void {
    // No se carga la tabla al entrar: el usuario debe presionar "Buscar".
    this.loadContractStates();
  }

  /** Carga el catálogo de estados de contrato desde el backend. */
  private loadContractStates(): void {
    this.contractsService.getContractStates().subscribe({
      next: (states) => this.contractStates.set(states),
      error: (err) => console.error('Error cargando estados de contrato:', err),
    });
  }

  /** Devuelve la etiqueta legible de un estado según el catálogo del backend. */
  getEstadoLabel(estado: string): string {
    return this.contractStates().find((s) => s.codigo === estado)?.nombre ?? estado;
  }

  /** Carga la página actual de contratos desde el backend. */
  loadContracts(): void {
    this.isLoading.set(true);
    this.hasFetched.set(true);

    const term = this.searchTerm().trim();
    this.contractsService
      .getContracts({
        page: this.currentPage(),
        limit: this.pageSize(),
        numeroGuia: term || undefined,
      })
      .subscribe({
        next: (response) => {
          this.contracts.set(response.data);
          this.totalItems.set(response.meta.total);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error cargando contratos:', err);
          this.contracts.set([]);
          this.totalItems.set(0);
          this.isLoading.set(false);
        },
      });
  }

  search(): void {
    this.currentPage.set(1);
    this.loadContracts();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadContracts();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadContracts();
  }

  /** Devuelve el medidor vigente del contrato (el que no tiene fecha de fin). */
  getCurrentMeter(contract: IContract): IHistorialMedidor | null {
    return contract.historialMedidores?.find((h) => h.fechaHasta === null) ?? null;
  }

  /** Nombre legible del cliente del contrato. */
  getClientName(contract: IContract): string {
    const cliente = contract.cliente;
    if (!cliente) {
      return '—';
    }
    if (cliente.razonSocial) {
      return cliente.razonSocial;
    }
    return `${cliente.nombres ?? ''} ${cliente.apellidos ?? ''}`.trim() || '—';
  }

  // ---------- Registro de nuevo contrato ----------

  registerNewContract(): void {
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onContractSaved(): void {
    this.closeForm();
    this.currentPage.set(1);
    this.loadContracts();
  }
}
