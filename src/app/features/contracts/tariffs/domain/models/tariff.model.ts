import type { IRubro } from '../../../../billing/rubros/interfaces/irubro.interface';

export interface ITariffCategory {
  categoriaTarifaId?: number;
  nombre: string;
  descripcion?: string;
  consumoMinimoMensual?: number;
  activo?: boolean;
  rubros?: IRubro[];
}

export interface CreateTariffRequest {
  nombre: string;
  descripcion?: string;
  consumoMinimoMensual?: number;
}

export interface UpdateTariffRequest {
  nombre?: string;
  descripcion?: string;
  consumoMinimoMensual?: number;
  activo?: boolean;
}

/**
 * Shape de la respuesta paginada del endpoint /tariff-categories.
 * El backend devuelve un objeto con `data` y un `meta` opcional.
 */
export interface ITariffResponse {
  data: ITariffCategory[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Filtros aceptados por GET /tariff-categories. */
export interface ITariffQueryParams {
  page?: number;
  limit?: number;
  /** Filtro puntual por nombre. */
  nombre?: string;
  /** Búsqueda de texto libre sobre nombre y descripción. */
  search?: string;
}
