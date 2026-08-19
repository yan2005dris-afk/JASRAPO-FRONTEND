import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../../billing/payments/interfaces/ipayments.interface';
import {
  ICreateReadingAnomalyDto,
  IReadingAnomaly,
  IReadingAnomalyFilterParams,
  IUpdateReadingAnomalyDto,
} from '../interfaces/ianomaly.interface';

@Injectable({
  providedIn: 'root',
})
export class ReadingAnomaliesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/reading-anomalies`;

  getAnomalies(
    params?: IReadingAnomalyFilterParams,
  ): Observable<IPaginatedResult<IReadingAnomaly>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.lecturaId) {
      httpParams = httpParams.set('lecturaId', params.lecturaId);
    }
    if (params?.tipo) {
      httpParams = httpParams.set('tipo', params.tipo);
    }
    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }

    return this.http.get<IPaginatedResult<IReadingAnomaly>>(this.endpoint, {
      params: httpParams,
    });
  }

  getAnomalyById(id: string | number): Observable<IReadingAnomaly> {
    return this.http.get<IReadingAnomaly>(`${this.endpoint}/${id}`);
  }

  getAnomalyStates(): Observable<{ codigo: string; nombre: string; icono?: string }[]> {
    return this.http.get<{ codigo: string; nombre: string; icono?: string }[]>(
      `${this.endpoint}/estados`,
    );
  }

  createAnomaly(dto: ICreateReadingAnomalyDto, file?: File): Observable<IReadingAnomaly> {
    if (file) {
      const formData = new FormData();
      Object.entries(dto).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, String(val));
        }
      });
      formData.append('file', file, file.name);
      return this.http.post<IReadingAnomaly>(this.endpoint, formData);
    }
    return this.http.post<IReadingAnomaly>(this.endpoint, dto);
  }

  updateAnomaly(
    id: string | number,
    dto: IUpdateReadingAnomalyDto,
    file?: File,
  ): Observable<IReadingAnomaly> {
    if (file) {
      const formData = new FormData();
      Object.entries(dto).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, String(val));
        }
      });
      formData.append('file', file, file.name);
      return this.http.patch<IReadingAnomaly>(`${this.endpoint}/${id}`, formData);
    }
    return this.http.patch<IReadingAnomaly>(`${this.endpoint}/${id}`, dto);
  }

  deleteAnomaly(id: string | number): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(`${this.endpoint}/${id}`);
  }
}
