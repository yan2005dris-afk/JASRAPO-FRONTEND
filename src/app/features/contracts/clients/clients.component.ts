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
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ClientsService } from './services/clients.service';
import {
  SearchClientsParams,
  EstadoBusquedaCliente,
  IClient,
  IIdentificacion,
  TipoBusquedaCliente,
} from './interfaces/iclients.interface';
import { ClientsFormComponent } from './components/clients-form/clients-form.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { TableExportService } from '../../../shared/services/table-export.service';

@Component({
  selector: 'app-clients',
  imports: [
    CommonModule,
    FormsModule,
    ClientsFormComponent,
    PaginationComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ClientsComponent implements OnInit {
  readonly authService = inject(AuthService);

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly clientsService = inject(ClientsService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  // Modo selección: cuando es true, la pantalla se usa como selector dentro de otro formulario
  // (oculta crear/editar/eliminar y permite elegir un cliente con doble clic).
  readonly selectionMode = input(false);
  readonly clientSelected = output<IClient>();

  ngOnInit(): void {
    // En modo selección se cargan los clientes de una vez para poder elegir.
    if (this.selectionMode()) {
      this.searchClients();
    }
  }

  /** Emite el cliente elegido (solo en modo selección). */
  selectClient(cliente: IClient): void {
    if (this.selectionMode()) {
      this.clientSelected.emit(cliente);
    }
  }

  clients: IClient[] = [];
  totalItems = 0;

  isLoading = false;
  hasFetched = false;

  searchTerm = '';
  searchType: TipoBusquedaCliente = 'nombreCompleto';
  estadoBusqueda: EstadoBusquedaCliente = 'todos';

  isModalOpen = false;
  objetoClienteAEditar: IClient | null = null;

  isDetalleModalOpen = false;
  clienteDetalleSeleccionado: IClient | null = null;

  openDropdownId: string | number | null = null;

  toggleDropdown(id: string | number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === id ? null : id;
    this.cdr.markForCheck();
  }

  closeDropdowns(): void {
    if (this.openDropdownId !== null) {
      this.openDropdownId = null;
      this.cdr.markForCheck();
    }
  }

  pageSizeOptions = [5, 10, 15];
  pageSize = 5;
  currentPage = 1;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageNumbers(): number[] {
    const range = 2;
    const start = Math.max(1, this.currentPage - range);
    const end = Math.min(this.totalPages, this.currentPage + range);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  get pagedClients(): IClient[] {
    return this.clients;
  }

  searchClients(): void {
    this.currentPage = 1;
    this.hasFetched = true;
    this.fetchClientsComponent();
  }

  private buildParams(): SearchClientsParams {
    const valor = this.searchTerm.trim();
    const params: SearchClientsParams = {};

    if (valor) {
      if (this.searchType === 'nombreCompleto') {
        params.nombreCompleto = valor;
      } else if (this.searchType === 'identificacion') {
        params.identificacion = valor;
      }
    }

    if (this.estadoBusqueda === 'activos') params.activo = true;
    if (this.estadoBusqueda === 'inactivos') params.activo = false;

    return params;
  }

  private fetchClientsComponent(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    const valor = this.searchTerm.trim();
    const params: SearchClientsParams = {
      ...this.buildParams(),
      page: this.currentPage,
      limit: this.pageSize,
    };

    this.clientsService.searchClients(params).subscribe({
      next: (result) => {
        if (
          this.searchType === 'nombreCompleto' &&
          valor &&
          result.data.length === 0 &&
          this.currentPage === 1
        ) {
          this.fetchPorNombresYApellidos(valor);
          return;
        }

        this.clients = result.data;
        this.totalItems = result.meta.total;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error buscando clientes:', err);
        this.clients = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private fetchPorNombresYApellidos(valor: string): void {
    const partes = valor.replace(/\s+/g, ' ').trim().split(' ');

    let nombres = valor;
    let apellidos = '';

    if (partes.length >= 4) {
      const mitad = Math.ceil(partes.length / 2);
      nombres = partes.slice(0, mitad).join(' ');
      apellidos = partes.slice(mitad).join(' ');
    } else if (partes.length >= 2) {
      nombres = partes[0];
      apellidos = partes.slice(1).join(' ');
    }

    const params: SearchClientsParams = {
      nombres,
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (apellidos) params.apellidos = apellidos;
    if (this.estadoBusqueda === 'activos') params.activo = true;
    if (this.estadoBusqueda === 'inactivos') params.activo = false;

    this.clientsService.searchClients(params).subscribe({
      next: (result) => {
        this.clients = result.data;
        this.totalItems = result.meta.total;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error buscando por nombres y apellidos:', err);
        this.clients = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.searchType = 'nombreCompleto';
    this.estadoBusqueda = 'todos';
    this.currentPage = 1;
    this.hasFetched = true;
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

    if (this.estadoBusqueda === 'activos') params['activo'] = 'true';
    if (this.estadoBusqueda === 'inactivos') params['activo'] = 'false';

    this.router.navigate(['/app/reportes/listado-clientes'], { queryParams: params });
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  abrirModal(): void {
    this.objetoClienteAEditar = null;
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  cerrarModal(): void {
    this.objetoClienteAEditar = null;
    this.isModalOpen = false;
    this.cdr.markForCheck();
  }

  editarCliente(cliente: IClient): void {
    this.objetoClienteAEditar = cliente;
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  verDetalleCliente(cliente: IClient): void {
    const clienteId = this.obtenerIdCliente(cliente);

    if (clienteId === null) {
      alert('No se puede consultar el detalle porque el cliente no tiene ID válido.');
      return;
    }

    this.clientsService.getClientById(clienteId).subscribe({
      next: (clienteDetalle) => {
        this.clienteDetalleSeleccionado = clienteDetalle;
        this.isDetalleModalOpen = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error obteniendo detalle del cliente:', err);
        alert('No se pudo obtener el detalle del cliente.');
      },
    });
  }

  cerrarDetalleModal(): void {
    this.clienteDetalleSeleccionado = null;
    this.isDetalleModalOpen = false;
    this.cdr.markForCheck();
  }

  abrirEdicionDesdeDetalle(): void {
    if (!this.clienteDetalleSeleccionado) return;

    const cliente = this.clienteDetalleSeleccionado;
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
          this.isLoading = true;
          this.cdr.markForCheck();
          this.clientsService.deleteClient(clienteId).subscribe({
            next: () => {
              this.toastService.success('Cliente eliminado correctamente', 'Éxito');
              this.searchClients();
            },
            error: (err) => {
              console.error('Error eliminando cliente:', err);
              const msg = err.error?.message || 'Ocurrió un error al eliminar el cliente.';
              this.toastService.error(msg, 'Error');
              this.isLoading = false;
              this.cdr.markForCheck();
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
    this.pageSize = size;
    this.currentPage = 1;
    if (this.hasFetched) {
      this.fetchClientsComponent();
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchClientsComponent();
  }

  // ---------- Exportaciones (PDF, Excel, CSV) ----------
  private readonly tableExportService = inject(TableExportService);

  exportToPdf(): void {
    if (this.clients.length === 0) return;

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
      data: this.clients as unknown as Record<string, unknown>[],
      summary: `Total clientes: ${this.clients.length}`,
    });
  }

  exportToExcel(): void {
    if (this.clients.length === 0) return;

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
      data: this.clients as unknown as Record<string, unknown>[],
      summary: `Total clientes: ${this.clients.length}`,
    });
  }

  exportToCsv(): void {
    if (this.clients.length === 0) return;

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
      data: this.clients as unknown as Record<string, unknown>[],
    });
  }
}
