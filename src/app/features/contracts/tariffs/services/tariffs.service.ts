import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Observable } from 'rxjs';
import {
  ITariffCategory,
  CreateTariffRequest,
  UpdateTariffRequest,
} from '../domain/models/tariff.model';

export interface ITariffResponse {
  data: ITariffCategory[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ITariffQueryParams {
  page?: number;
  limit?: number;
  /** Filtro puntual por nombre. */
  nombre?: string;
  /** Búsqueda de texto libre sobre nombre y descripción. */
  search?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TariffsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/tariff-categories`;

  /**
   * Lista categorías de tarifa paginadas. `search` busca texto libre sobre
   * nombre y descripción; `nombre` sigue filtrando solo por ese campo.
   */
  getTariffs(params?: ITariffQueryParams): Observable<ITariffResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<ITariffResponse>(this.endpoint, { params: httpParams });
  }

  getTariffById(id: number): Observable<ITariffCategory> {
    return this.http.get<ITariffCategory>(`${this.endpoint}/${id}`);
  }

  createTariff(tariff: CreateTariffRequest): Observable<ITariffCategory> {
    return this.http.post<ITariffCategory>(this.endpoint, tariff);
  }

  updateTariff(id: number, tariff: UpdateTariffRequest): Observable<ITariffCategory> {
    return this.http.patch<ITariffCategory>(`${this.endpoint}/${id}`, tariff);
  }

  deleteTariff(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
