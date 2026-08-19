import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { map, Observable } from 'rxjs';
import {
  ITariffCategory,
  CreateTariffRequest,
  UpdateTariffRequest,
} from '../interfaces/itariff.interface';

export interface ITariffResponse {
  data: ITariffCategory[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class TariffsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/tariff-categories`;

  getTariffs(params?: { page?: number; limit?: number; nombre?: string }): Observable<ITariffCategory[]> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.nombre) httpParams = httpParams.set('nombre', params.nombre);

    return this.http
      .get<{ data: ITariffCategory[]; meta?: any }>(this.endpoint, { params: httpParams })
      .pipe(map((res) => res.data));
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
