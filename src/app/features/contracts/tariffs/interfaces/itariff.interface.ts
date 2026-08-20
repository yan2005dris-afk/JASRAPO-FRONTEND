import type { IRubro } from '../../../billing/rubros/interfaces/irubro.interface';

export interface ITariffCategory {
  categoriaTarifaId?: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  rubros?: IRubro[];
}

export interface CreateTariffRequest {
  nombre: string;
  descripcion?: string;
}

export interface UpdateTariffRequest {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}
