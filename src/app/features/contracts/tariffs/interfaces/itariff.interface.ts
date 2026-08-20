import type { IRubro } from '../../../billing/rubros/interfaces/irubro.interface';

export interface ITariffCategory {
  categoriaTarifaId?: number;
  nombre: string;
  descripcion?: string;
  valorBase: number;
  consumoMinimoMensual: number;
  valorExcedenteM3: number;
  activo?: boolean;
  rubros?: IRubro[];
}

export interface CreateTariffRequest {
  nombre: string;
  descripcion?: string;
  valorBase: number;
  consumoMinimoMensual: number;
  valorExcedenteM3: number;
}

export interface UpdateTariffRequest {
  nombre?: string;
  descripcion?: string;
  valorBase?: number;
  consumoMinimoMensual?: number;
  valorExcedenteM3?: number;
  activo?: boolean;
}
