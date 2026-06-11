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

export interface PaginatedUsersResponse {
  data: User[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

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
