import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContractsService } from './services/contracts.service';
import {
  IContract,
  IContractState,
  IHistorialMedidor,
  ISearchContractsParams,
  SearchContractField,
} from './interfaces/icontract.interface';
import { ServiceContractFormComponent } from './components/service-contract-form/service-contract-form.component';
import { ReplaceMeterModalComponent } from '../meters/components/replace-meter-modal/replace-meter-modal.component';
import { AssignInstallationRouteModalComponent } from './components/assign-installation-route-modal/assign-installation-route-modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';

@Component({
  selector: 'app-service-contracts',
  imports: [
    FormsModule,
    ServiceContractFormComponent,
    ReplaceMeterModalComponent,
    AssignInstallationRouteModalComponent,
    PaginationComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './service-contracts.component.html',
  styleUrl: './service-contracts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ServiceContractsComponent implements OnInit {
  private readonly contractsService = inject(ContractsService);

  // Menú de acciones por fila (tres puntitos)
  readonly openDropdownId = signal<string | null>(null);

  // Contrato en edición (null = formulario en modo creación)
  readonly editingContract = signal<IContract | null>(null);

  // Contrato en reemplazo de medidor
  readonly replacingMeterContract = signal<IContract | null>(null);

  // Contrato en asignación de ruta de instalación (SC-174)
  readonly assigningContract = signal<IContract | null>(null);

  toggleDropdown(contratoId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update((id) => (id === contratoId ? null : contratoId));
  }

  closeDropdowns(): void {
    this.openDropdownId.set(null);
  }

  /** Abre el formulario en modo edición con el contrato seleccionado. */
  editContract(contract: IContract): void {
    this.closeDropdowns();
    this.editingContract.set(contract);
    this.isFormOpen.set(true);
  }

  /** Abre el modal de reemplazo de medidor. */
  openReplaceMeterModal(contract: IContract): void {
    this.closeDropdowns();
    this.replacingMeterContract.set(contract);
  }

  closeReplaceMeterModal(): void {
    this.replacingMeterContract.set(null);
  }

  onMeterReplaced(): void {
    this.closeReplaceMeterModal();
    this.loadContracts();
  }

  // Estado del listado
  readonly contracts = signal<IContract[]>([]);
  readonly totalItems = signal(0);
  readonly isLoading = signal(false);
  readonly hasFetched = signal(false);

  // Búsqueda: texto + campo a buscar (columna visible) + filtro de estado
  readonly searchTerm = signal('');
  readonly searchField = signal<SearchContractField>('numeroGuia');
  readonly estadoFilter = signal(''); // '' = todos los estados

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

  /** Carga la página actual de contratos desde el backend, aplicando los filtros. */
  loadContracts(): void {
    this.isLoading.set(true);
    this.hasFetched.set(true);

    const params: ISearchContractsParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    // Filtro de texto: se manda según el campo (columna) seleccionado.
    const term = this.searchTerm().trim();
    if (term) {
      params[this.searchField()] = term;
    }

    // Filtro por estado (si no es "todos").
    const estado = this.estadoFilter();
    if (estado) {
      params.estado = estado;
    }

    this.contractsService.getContracts(params).subscribe({
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

  /** Limpia los filtros y vuelve al estado inicial (sin resultados). */
  limpiarBusqueda(): void {
    this.searchTerm.set('');
    this.searchField.set('numeroGuia');
    this.estadoFilter.set('');
    this.currentPage.set(1);
    this.contracts.set([]);
    this.totalItems.set(0);
    this.hasFetched.set(false);
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
    this.editingContract.set(null);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingContract.set(null);
  }

  onContractSaved(): void {
    this.closeForm();
    this.currentPage.set(1);
    this.loadContracts();
  }

  // ---------- Asignar contrato a ruta de instalación (SC-174) ----------

  openAssignInstallationModal(contract: IContract): void {
    this.closeDropdowns();
    this.assigningContract.set(contract);
  }

  closeAssignInstallationModal(): void {
    this.assigningContract.set(null);
  }

  onRouteAssigned(): void {
    this.closeAssignInstallationModal();
    this.loadContracts();
  }
}
