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
import { ContractsTableComponent } from './components/contracts-table/contracts-table.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableExportService } from '../../../shared/services/table-export.service';
import {
  DropdownComponent,
  DropdownItem,
} from '../../../shared/components/dropdown/dropdown.component';

@Component({
  selector: 'app-service-contracts',
  imports: [
    FormsModule,
    ServiceContractFormComponent,
    ReplaceMeterModalComponent,
    AssignInstallationRouteModalComponent,
    ContractsTableComponent,
    PaginationComponent,
    TableSkeletonComponent,
    DropdownComponent,
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

  readonly exportItems: DropdownItem[] = [
    { label: 'Exportar a PDF', action: 'pdf', icon: 'bi bi-file-earmark-pdf-fill text-danger' },
    {
      label: 'Exportar a Excel (.xls)',
      action: 'excel',
      icon: 'bi bi-file-earmark-excel-fill text-success',
    },
    { label: 'Exportar a CSV', action: 'csv', icon: 'bi bi-file-earmark-text-fill text-primary' },
  ];

  handleExportAction(action: string): void {
    if (action === 'pdf') this.exportToPdf();
    else if (action === 'excel') this.exportToExcel();
    else if (action === 'csv') this.exportToCsv();
  }

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
    this.loadContractStates();
    this.loadContracts();
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

  // ---------- Exportaciones (PDF, Excel, CSV) ----------
  private readonly tableExportService = inject(TableExportService);

  exportToPdf(): void {
    const data = this.contracts();
    if (data.length === 0) return;

    this.tableExportService.exportToPdf({
      title: 'LISTADO DE CONTRATOS DE SERVICIO',
      fileName: `Contratos_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'N° Guía', key: 'numeroGuia', width: 65 },
        {
          header: 'Cliente',
          transform: (c) => this.getClientName(c as unknown as IContract),
          width: 110,
        },
        {
          header: 'Identificación',
          transform: (c) => (c as unknown as IContract).cliente?.identificacion ?? '—',
          width: 70,
        },
        {
          header: 'Medidor',
          transform: (c) => this.getCurrentMeter(c as unknown as IContract)?.medidor?.serie ?? '—',
          width: 60,
        },
        { header: 'Ubicación', key: 'direccionSuministro', width: 110 },
        {
          header: 'Estado',
          transform: (c) => (c as unknown as IContract).estado || '—',
          width: 60,
          align: 'center',
        },
      ],
      data: data as unknown as Record<string, unknown>[],
      summary: `Total de contratos exportados: ${data.length}`,
    });
  }

  exportToExcel(): void {
    const data = this.contracts();
    if (data.length === 0) return;

    this.tableExportService.exportToExcel({
      title: 'LISTADO DE CONTRATOS DE SERVICIO',
      fileName: `Contratos_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'N° Guía', key: 'numeroGuia' },
        {
          header: 'Cliente',
          transform: (c) => this.getClientName(c as unknown as IContract),
        },
        {
          header: 'Identificación',
          transform: (c) => (c as unknown as IContract).cliente?.identificacion ?? '—',
        },
        {
          header: 'Medidor',
          transform: (c) => this.getCurrentMeter(c as unknown as IContract)?.medidor?.serie ?? '—',
        },
        { header: 'Ubicación', key: 'direccionSuministro' },
        {
          header: 'Estado',
          transform: (c) => (c as unknown as IContract).estado || '—',
        },
      ],
      data: data as unknown as Record<string, unknown>[],
      summary: `Total de contratos exportados: ${data.length}`,
    });
  }

  exportToCsv(): void {
    const data = this.contracts();
    if (data.length === 0) return;

    this.tableExportService.exportToCsv({
      title: 'LISTADO DE CONTRATOS DE SERVICIO',
      fileName: `Contratos_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'N° Guía', key: 'numeroGuia' },
        {
          header: 'Cliente',
          transform: (c) => this.getClientName(c as unknown as IContract),
        },
        {
          header: 'Identificación',
          transform: (c) => (c as unknown as IContract).cliente?.identificacion ?? '—',
        },
        {
          header: 'Medidor',
          transform: (c) => this.getCurrentMeter(c as unknown as IContract)?.medidor?.serie ?? '—',
        },
        { header: 'Ubicación', key: 'direccionSuministro' },
        {
          header: 'Estado',
          transform: (c) => (c as unknown as IContract).estado || '—',
        },
      ],
      data: data as unknown as Record<string, unknown>[],
    });
  }
}
