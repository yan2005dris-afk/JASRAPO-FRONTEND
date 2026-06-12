import { PaginatedResponse } from '../../../../shared/models/paginated-response';

export interface Comunidad {
  id: number;
  nombre: string;
  codigo: string;
  porcentajeTasaSeguridad: number;
}

export type PaginatedComunidadesResponse = PaginatedResponse<Comunidad>;
