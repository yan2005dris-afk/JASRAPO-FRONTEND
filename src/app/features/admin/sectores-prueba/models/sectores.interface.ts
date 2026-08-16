import { PaginatedResponse } from '../../../../shared/models/paginated-response';

export interface Sectores {
  sectorId?: number;
  comunidadId: number;
  codigo: string;
  nombre: string;
}

export type PaginatedSectoresResponse = PaginatedResponse<Sectores>;
