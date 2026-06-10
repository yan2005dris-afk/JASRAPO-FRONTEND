import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { ClientesService } from './services/clientes.service';
import {
  EstadoBusquedaCliente,
  IClientes,
  IIdentificacion,
  TipoBusquedaCliente,
} from './interfaces/iclientes.interface';
import { ClientesFormComponent } from './components/clientes-form/clientes-form.component';

@Component({
  selector: 'app-clientes',
  imports: [CommonModule, FormsModule, ClientesFormComponent],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Clientes {
  readonly authService = inject(AuthService);

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly clientesService = inject(ClientesService);

  clients: IClientes[] = [];

  isLoading = false;
  hasFetched = false;

  searchTerm = '';
  searchType: TipoBusquedaCliente = 'nombreCompleto';
  estadoBusqueda: EstadoBusquedaCliente = 'todos';

  isModalOpen = false;
  objetoClienteAEditar: IClientes | null = null;

  isDetalleModalOpen = false;
  clienteDetalleSeleccionado: IClientes | null = null;

  pageSizeOptions = [5, 10, 15];
  pageSize = 5;
  currentPage = 1;

  get filteredClients(): IClientes[] {
    return this.clients;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredClients.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedClients(): IClientes[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredClients.slice(start, start + this.pageSize);
  }

  buscarClientes(): void {
    this.isLoading = true;
    this.hasFetched = true;
    this.cdr.markForCheck();

    const valor = this.searchTerm.trim();

    const filtros: {
      nombreCompleto?: string;
      identificacion?: string;
      activo?: boolean;
    } = {};

    if (valor) {
      if (this.searchType === 'nombreCompleto') {
        filtros.nombreCompleto = valor;
      }

      if (this.searchType === 'identificacion') {
        filtros.identificacion = valor;
      }
    }

    if (this.estadoBusqueda === 'activos') {
      filtros.activo = true;
    }

    if (this.estadoBusqueda === 'inactivos') {
      filtros.activo = false;
    }

    this.clientesService.buscarClientes(filtros).subscribe({
      next: (response) => {
        const clientes = this.normalizarRespuestaClientes(response);

        if (this.searchType === 'nombreCompleto' && valor && clientes.length === 0) {
          this.buscarNombreCompletoPorNombresYApellidos(valor);
          return;
        }

        this.clients = clientes;
        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error buscando clientes desde GET /clients:', err);

        if (this.estadoBusqueda === 'activos' || this.estadoBusqueda === 'inactivos') {
          this.filtrarEstadoLocalmente();
          return;
        }

        this.clients = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.markForCheck();
      },
    });
  }

  buscarNombreCompletoPorNombresYApellidos(valor: string): void {
    const partes = valor.replace(/\s+/g, ' ').trim().split(' ');

    let nombres = valor;
    let apellidos = '';

    if (partes.length >= 4) {
      const mitad = Math.ceil(partes.length / 2);

      nombres = partes.slice(0, mitad).join(' ');
      apellidos = partes.slice(mitad).join(' ');
    } else if (partes.length === 3) {
      nombres = partes.slice(0, 1).join(' ');
      apellidos = partes.slice(1).join(' ');
    } else if (partes.length === 2) {
      nombres = partes.slice(0, 1).join(' ');
      apellidos = partes.slice(1).join(' ');
    }

    const filtros: {
      nombres?: string;
      apellidos?: string;
      activo?: boolean;
    } = {
      nombres,
    };

    if (apellidos) {
      filtros.apellidos = apellidos;
    }

    if (this.estadoBusqueda === 'activos') {
      filtros.activo = true;
    }

    if (this.estadoBusqueda === 'inactivos') {
      filtros.activo = false;
    }

    this.clientesService.buscarClientes(filtros).subscribe({
      next: (response) => {
        this.clients = this.normalizarRespuestaClientes(response);
        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error buscando por nombres y apellidos:', err);

        this.clients = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.markForCheck();
      },
    });
  }

  cargarTodosLosClientes(): void {
    this.isLoading = true;
    this.hasFetched = true;
    this.cdr.markForCheck();

    this.clientesService.getAllClientes().subscribe({
      next: (response) => {
        this.clients = this.normalizarRespuestaClientes(response);
        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando clientes:', err);
        this.clients = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.markForCheck();
      },
    });
  }

  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.searchType = 'nombreCompleto';
    this.estadoBusqueda = 'todos';
    this.cargarTodosLosClientes();
  }

  filtrarEstadoLocalmente(): void {
    this.clientesService.getAllClientes().subscribe({
      next: (response) => {
        const clientes = this.normalizarRespuestaClientes(response);

        if (this.estadoBusqueda === 'activos') {
          this.clients = clientes.filter((cliente) => cliente.activo !== false);
        } else if (this.estadoBusqueda === 'inactivos') {
          this.clients = clientes.filter((cliente) => cliente.activo === false);
        } else {
          this.clients = clientes;
        }

        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.markForCheck();
      },
      error: (errorGetAll) => {
        console.error('Error cargando clientes para filtrar estado localmente:', errorGetAll);

        this.clients = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.cdr.markForCheck();
      },
    });
  }

  normalizarRespuestaClientes(response: unknown): IClientes[] {
    if (Array.isArray(response)) {
      return response as IClientes[];
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const respuesta = response as Record<string, unknown>;

    if (Array.isArray(respuesta['data'])) {
      return respuesta['data'] as IClientes[];
    }

    const data = respuesta['data'];

    if (data && typeof data === 'object') {
      const dataObject = data as Record<string, unknown>;

      if (Array.isArray(dataObject['items'])) {
        return dataObject['items'] as IClientes[];
      }

      if (Array.isArray(dataObject['results'])) {
        return dataObject['results'] as IClientes[];
      }
    }

    if (Array.isArray(respuesta['items'])) {
      return respuesta['items'] as IClientes[];
    }

    if (Array.isArray(respuesta['results'])) {
      return respuesta['results'] as IClientes[];
    }

    if (Array.isArray(respuesta['clientes'])) {
      return respuesta['clientes'] as IClientes[];
    }

    if (Array.isArray(respuesta['clients'])) {
      return respuesta['clients'] as IClientes[];
    }

    return [];
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

  editarCliente(cliente: IClientes): void {
    this.objetoClienteAEditar = cliente;
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  verDetalleCliente(cliente: IClientes): void {
    const clienteId = this.obtenerIdCliente(cliente);

    if (clienteId === null) {
      alert('No se puede consultar el detalle porque el cliente no tiene ID válido.');
      return;
    }

    this.clientesService.getClienteById(clienteId).subscribe({
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
    if (!this.clienteDetalleSeleccionado) {
      return;
    }

    const cliente = this.clienteDetalleSeleccionado;

    this.cerrarDetalleModal();
    this.editarCliente(cliente);
  }

  eliminarCliente(cliente: IClientes): void {
    const clienteId = this.obtenerIdCliente(cliente);

    if (clienteId === null) {
      console.error('No se puede eliminar el cliente porque no tiene id:', cliente);
      alert('No se puede eliminar este cliente porque no tiene un ID válido.');
      return;
    }

    const nombreCliente = this.obtenerNombreCliente(cliente);

    if (!confirm(`¿Seguro que deseas eliminar al cliente ${nombreCliente}?`)) {
      return;
    }

    this.clientesService.deleteCliente(clienteId).subscribe({
      next: () => {
        console.log('Cliente eliminado correctamente');
        this.buscarClientes();
      },
      error: (err) => {
        console.error('Error eliminando cliente:', err);
        alert('Ocurrió un error al eliminar el cliente.');
      },
    });
  }

  obtenerIdCliente(cliente: IClientes): string | number | null {
    return cliente.id ?? cliente.clienteId ?? cliente.clientId ?? cliente._id ?? null;
  }

  obtenerNombreCliente(cliente: IClientes): string {
    const nombreCompleto = `${cliente.nombres ?? ''} ${cliente.apellidos ?? ''}`.trim();

    return cliente.razonSocial || nombreCompleto || 'Sin nombre';
  }

  obtenerTipoIdentificacionCliente(cliente: IClientes | null): string {
    if (!cliente?.tipoIdentificacion) {
      return 'No registrado';
    }

    if (typeof cliente.tipoIdentificacion === 'string') {
      return cliente.tipoIdentificacion;
    }

    const tipoIdentificacion = cliente.tipoIdentificacion as IIdentificacion;

    return tipoIdentificacion.nombre || tipoIdentificacion.codigo || 'No registrado';
  }

  setPageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.cdr.markForCheck();
  }
}
