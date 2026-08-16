import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { map, Observable } from 'rxjs';
import {
  ITariffCategory,
  CreateTariffRequest,
  UpdateTariffRequest,
} from '../interfaces/itariff.interface';

@Injectable({
  providedIn: 'root',
})
export class TariffsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/tariff-categories`;

  getTariffs(): Observable<ITariffCategory[]> {
    return this.http.get<{ data: ITariffCategory[] }>(this.endpoint).pipe(map((res) => res.data));
  }

  getTariffById(id: number): Observable<ITariffCategory> {
    return this.http.get<ITariffCategory>(`${this.endpoint}/${id}`);
  }

  // Deshabilitado por ahora: tabla quemada (pocos registros fijos). Ver ticket #61.
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
