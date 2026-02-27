export type ClientStatus = 'Activo' | 'Sin lectura' | 'Moroso';

export interface Client {
  id: number;
  nombre: string;
  sector: string;
  consumo: number;
  estado: ClientStatus;
}

export interface ClientFilter {
  label: string;
  value: string;
}

export interface PaginationState {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
}
