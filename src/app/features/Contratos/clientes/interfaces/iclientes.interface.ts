export interface IIdentificacion {
  id?: string | number;
  identificacionId?: string | number;
  codigo: string;
  nombre?: string;
  descripcion?: string;
  activo: boolean;
  orden: number;
}

export type TipoBusquedaCliente = 'nombreCompleto' | 'identificacion';

export type EstadoBusquedaCliente = 'todos' | 'activos' | 'inactivos';

export interface IClientes {
  id?: string | number;
  clienteId?: string | number;
  clientId?: string | number;
  _id?: string | number;

  tipoIdentificacionId?: string | number;
  tipoIdentificacion?: IIdentificacion | string | null;

  identificacion: string;

  nombres?: string;
  apellidos?: string;
  razonSocial?: string | null;

  email: string;
  telefono: string;
  telefonoSecundario?: string | null;

  aplicaTerceraEdad: boolean;
  aplicaDiscapacidad: boolean;

  direccionDomicilio: string;

  activo?: boolean;
}

export interface CrearClienteRequest {
  tipoIdentificacionId: number;

  identificacion: string;

  nombres?: string;
  apellidos?: string;
  razonSocial?: string | null;

  email: string;
  telefono: string;
  telefonoSecundario?: string | null;

  aplicaTerceraEdad: boolean;
  aplicaDiscapacidad: boolean;

  direccionDomicilio: string;
}

export interface ActualizarClienteRequest {
  tipoIdentificacionId?: number;

  identificacion?: string;

  nombres?: string;
  apellidos?: string;
  razonSocial?: string | null;

  email?: string;
  telefono?: string;
  telefonoSecundario?: string | null;

  aplicaTerceraEdad?: boolean;
  aplicaDiscapacidad?: boolean;

  direccionDomicilio?: string;

  activo?: boolean;
}

export interface BuscarClientesParams {
  nombreCompleto?: string;
  identificacion?: string;
  nombres?: string;
  apellidos?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}

export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  ultimaPagina: number;
  paginaActual: number;
  porPagina: number;
  anterior: number | null;
  siguiente: number | null;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: IPaginationMeta;
}
