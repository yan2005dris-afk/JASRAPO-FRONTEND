import { PaginatedMeta, PaginatedResponse } from '../../../shared/models/paginated-response';

export interface Role {
  rolId: number;
  nombre: string;
}

export interface User {
  usuarioId: number;
  email: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  avatar?: unknown;
  rol: Role | null;
}

export type PaginatedUsersMeta = PaginatedMeta;
export type PaginatedUsersResponse = PaginatedResponse<User>;

export interface CreateUserPayload {
  email: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  rolId?: number;
}

export interface UpdateUserPayload {
  email?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  rolId?: number;
}
