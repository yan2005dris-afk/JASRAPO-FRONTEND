import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ClientsService } from './services/clients.service';
import {
  SearchClientsParams,
  EstadoBusquedaCliente,
  IClient,
  IIdentificacion,
} from './interfaces/iclients.interface';
import { ClientsFormComponent } from './components/clients-form/clients-form.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableExportService } from '../../../shared/services/table-export.service';
import {
  DropdownComponent,
  DropdownItem,
} from '../../../shared/components/dropdown/dropdown.component';

@Component({
  selector: 'app-clients',
  imports: [
    CommonModule,
    FormsModule,
    ClientsFormComponent,
    PaginationComponent,
    TableSkeletonComponent,
    DropdownComponent,
  ],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ClientsComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);

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

  private readonly clientsService = inject(ClientsService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  // Modo selección: cuando es true, la pantalla se usa como selector dentro de otro formulario
  // (oculta crear/editar/eliminar y permite elegir un cliente con doble clic).
  readonly selectionMode = input(false);
  readonly clientSelected = output<IClient>();

  // Estado reactivo con Signals
  readonly clients = signal<IClient[]>([]);
  readonly totalItems = signal(0);
  readonly isLoading = signal(false);
  readonly hasFetched = signal(false);

  readonly searchTerm = signal('');
  readonly estadoBusqueda = signal<EstadoBusquedaCliente>('todos');

  readonly isModalOpen = signal(false);
  readonly objetoClienteAEditar = signal<IClient | null>(null);

  readonly isDetalleModalOpen = signal(false);
  readonly clienteDetalleSeleccionado = signal<IClient | null>(null);

  readonly openDropdownId = signal<string | number | null>(null);

  readonly pageSizeOptions = [5, 10, 15];
  readonly pageSize = signal(5);
  readonly currentPage = signal(1);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));

  readonly pageNumbers = computed(() => {
    const range = 2;
    const current = this.currentPage();
    const total = this.totalPages();
    const start = Math.max(1, current - range);
    const end = Math.min(total, current + range);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Carga de clientes inicial automática
    this.searchClients();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  /** Emite el cliente elegido (solo en modo selección). */
  selectClient(cliente: IClient): void {
    if (this.selectionMode()) {
      this.clientSelected.emit(cliente);
    }
  }

  /**
   * Cliente recién creado desde el modal. En modo selección se elige solo, para
   * que quien abrió el selector (el formulario de contrato) continúe sin tener
   * que buscarlo a mano. Fuera del modo selección basta con refrescar el listado.
   */
  onClientCreated(cliente: IClient): void {
    if (this.selectionMode()) {
      this.clientSelected.emit(cliente);
    }
  }

  toggleDropdown(id: string | number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update((current) => (current === id ? null : id));
  }

  closeDropdowns(): void {
    if (this.openDropdownId() !== null) {
      this.openDropdownId.set(null);
    }
  }

  onSearchTermChange(term: string): void {
    this.searchTerm.set(term);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.searchClients();
    }, 400);
  }

  onEstadoBusquedaChange(estado: EstadoBusquedaCliente): void {
    this.estadoBusqueda.set(estado);
    this.searchClients();
  }

  searchClients(): void {
    this.currentPage.set(1);
    this.hasFetched.set(true);
    this.fetchClientsComponent();
  }

  private buildParams(): SearchClientsParams {
    const valor = this.searchTerm().trim();
    const params: SearchClientsParams = {};

    if (valor) {
      params.search = valor;
    }

    const estado = this.estadoBusqueda();
    if (estado === 'activos') params.activo = true;
    if (estado === 'inactivos') params.activo = false;

    return params;
  }

  private fetchClientsComponent(): void {
    this.isLoading.set(true);

    const params: SearchClientsParams = {
      ...this.buildParams(),
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    this.clientsService.searchClients(params).subscribe({
      next: (result) => {
        this.clients.set(result.data);
        this.totalItems.set(result.meta.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error buscando clientes:', err);
        this.clients.set([]);
        this.totalItems.set(0);
        this.isLoading.set(false);
      },
    });
  }

  limpiarBusqueda(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTerm.set('');
    this.estadoBusqueda.set('todos');
    this.currentPage.set(1);
    this.fetchClientsComponent();
  }

  /** Navega al reporte Listado de Clientes con el rango del año actual y el estado seleccionado. */
  exportarPdf(): void {
    const hoy = new Date();
    const primerDiaAnio = new Date(hoy.getFullYear(), 0, 1);

    const params: Record<string, string> = {
      fechaDesde: this.toIsoDate(primerDiaAnio),
      fechaHasta: this.toIsoDate(hoy),
    };

    const estado = this.estadoBusqueda();
    if (estado === 'activos') params['activo'] = 'true';
    if (estado === 'inactivos') params['activo'] = 'false';

    this.router.navigate(['/app/reportes/listado-clientes'], { queryParams: params });
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  abrirModal(): void {
    if (this.selectionMode()) {
      this.objetoClienteAEditar.set(null);
      this.isModalOpen.set(true);
    } else {
      this.router.navigate(['/app/Contratos/Cliente/new']);
    }
  }

  cerrarModal(): void {
    this.objetoClienteAEditar.set(null);
    this.isModalOpen.set(false);
  }

  editarCliente(cliente: IClient): void {
    const clienteId = this.obtenerIdCliente(cliente);

    if (this.selectionMode()) {
      this.objetoClienteAEditar.set(cliente);
      this.isModalOpen.set(true);
    } else if (clienteId !== null) {
      this.router.navigate(['/app/Contratos/Cliente', clienteId, 'edit']);
    }
  }

  verDetalleCliente(cliente: IClient): void {
    const clienteId = this.obtenerIdCliente(cliente);

    if (clienteId === null) {
      this.toastService.error(
        'No se puede consultar el detalle porque el cliente no tiene ID válido.',
        'Error',
      );
      return;
    }

    this.clientsService.getClientById(clienteId).subscribe({
      next: (clienteDetalle) => {
        this.clienteDetalleSeleccionado.set(clienteDetalle);
        this.isDetalleModalOpen.set(true);
      },
      error: (err) => {
        console.error('Error obteniendo detalle del cliente:', err);
        this.toastService.error('No se pudo obtener el detalle del cliente.', 'Error');
      },
    });
  }

  cerrarDetalleModal(): void {
    this.clienteDetalleSeleccionado.set(null);
    this.isDetalleModalOpen.set(false);
  }

  abrirEdicionDesdeDetalle(): void {
    const cliente = this.clienteDetalleSeleccionado();
    if (!cliente) return;

    this.cerrarDetalleModal();
    this.editarCliente(cliente);
  }

  eliminarCliente(cliente: IClient): void {
    const clienteId = this.obtenerIdCliente(cliente);

    if (clienteId === null) {
      this.toastService.error(
        'No se puede eliminar este cliente porque no tiene un ID válido.',
        'Error',
      );
      return;
    }

    const nombreCliente = this.obtenerNombreCliente(cliente);

    this.dialogService
      .confirm({
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar al cliente ${nombreCliente}? Esta acción no se puede deshacer.`,
        isDanger: true,
        confirmText: 'Eliminar',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading.set(true);
          this.clientsService.deleteClient(clienteId).subscribe({
            next: () => {
              this.toastService.success('Cliente eliminado correctamente', 'Éxito');
              this.searchClients();
            },
            error: (err) => {
              console.error('Error eliminando cliente:', err);
              const msg = err.error?.message || 'Ocurrió un error al eliminar el cliente.';
              this.toastService.error(msg, 'Error');
              this.isLoading.set(false);
            },
          });
        }
      });
  }

  obtenerIdCliente(cliente: IClient): string | number | null {
    return cliente.id ?? cliente.clienteId ?? cliente.clientId ?? cliente._id ?? null;
  }

  obtenerNombreCliente(cliente: IClient): string {
    const nombreCompleto = `${cliente.nombres ?? ''} ${cliente.apellidos ?? ''}`.trim();
    return cliente.razonSocial || nombreCompleto || 'Sin nombre';
  }

  obtenerTipoIdentificacionCliente(cliente: IClient | null): string {
    if (!cliente?.tipoIdentificacion) return 'No registrado';

    if (typeof cliente.tipoIdentificacion === 'string') {
      return cliente.tipoIdentificacion;
    }

    const tipo = cliente.tipoIdentificacion as IIdentificacion;
    return tipo.nombre || tipo.codigo || 'No registrado';
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    if (this.hasFetched()) {
      this.fetchClientsComponent();
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchClientsComponent();
  }

  // ---------- Exportaciones (PDF, Excel, CSV) ----------
  private readonly tableExportService = inject(TableExportService);

  exportToPdf(): void {
    const list = this.clients();
    if (list.length === 0) return;

    this.tableExportService.exportToPdf({
      title: 'LISTADO GENERAL DE CLIENTES',
      fileName: `Clientes_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        {
          header: 'Cliente',
          transform: (c) => this.obtenerNombreCliente(c as unknown as IClient),
          width: 120,
        },
        {
          header: 'Tipo Doc.',
          transform: (c) => this.obtenerTipoIdentificacionCliente(c as unknown as IClient),
          width: 60,
        },
        {
          header: 'Identificación',
          transform: (c) => (c as unknown as IClient).identificacion ?? '—',
          width: 75,
        },
        { header: 'Email', transform: (c) => (c as unknown as IClient).email ?? '—', width: 110 },
        {
          header: 'Teléfono',
          transform: (c) => (c as unknown as IClient).telefono ?? '—',
          width: 70,
        },
        {
          header: 'Estado',
          transform: (c) => ((c as unknown as IClient).activo ? 'ACTIVO' : 'INACTIVO'),
          width: 50,
          align: 'center',
        },
      ],
      data: list as unknown as Record<string, unknown>[],
      summary: `Total clientes: ${list.length}`,
    });
  }

  exportToExcel(): void {
    const list = this.clients();
    if (list.length === 0) return;

    this.tableExportService.exportToExcel({
      title: 'LISTADO GENERAL DE CLIENTES',
      fileName: `Clientes_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Cliente', transform: (c) => this.obtenerNombreCliente(c as unknown as IClient) },
        {
          header: 'Tipo Identificación',
          transform: (c) => this.obtenerTipoIdentificacionCliente(c as unknown as IClient),
        },
        {
          header: 'Identificación',
          transform: (c) => (c as unknown as IClient).identificacion ?? '—',
        },
        { header: 'Email', transform: (c) => (c as unknown as IClient).email ?? '—' },
        { header: 'Teléfono', transform: (c) => (c as unknown as IClient).telefono ?? '—' },
        {
          header: 'Estado',
          transform: (c) => ((c as unknown as IClient).activo ? 'ACTIVO' : 'INACTIVO'),
        },
      ],
      data: list as unknown as Record<string, unknown>[],
      summary: `Total clientes: ${list.length}`,
    });
  }

  exportToCsv(): void {
    const list = this.clients();
    if (list.length === 0) return;

    this.tableExportService.exportToCsv({
      title: 'LISTADO GENERAL DE CLIENTES',
      fileName: `Clientes_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Cliente', transform: (c) => this.obtenerNombreCliente(c as unknown as IClient) },
        {
          header: 'Tipo Identificación',
          transform: (c) => this.obtenerTipoIdentificacionCliente(c as unknown as IClient),
        },
        {
          header: 'Identificación',
          transform: (c) => (c as unknown as IClient).identificacion ?? '—',
        },
        { header: 'Email', transform: (c) => (c as unknown as IClient).email ?? '—' },
        { header: 'Teléfono', transform: (c) => (c as unknown as IClient).telefono ?? '—' },
        {
          header: 'Estado',
          transform: (c) => ((c as unknown as IClient).activo ? 'ACTIVO' : 'INACTIVO'),
        },
      ],
      data: list as unknown as Record<string, unknown>[],
    });
  }
}
