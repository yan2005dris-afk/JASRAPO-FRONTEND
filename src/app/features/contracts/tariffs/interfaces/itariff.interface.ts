export interface ITariffCategory {
  categoriaTarifaId?: number;
  nombre: string;
  descripcion?: string;
  valorBase: number;
  consumoMinimoMensual: number;
  valorExcedenteM3: number;
  activo?: boolean;
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
