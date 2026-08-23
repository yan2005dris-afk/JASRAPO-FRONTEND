import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../../billing/payments/interfaces/ipayments.interface';
import {
  ICreateReadingDto,
  IReading,
  IReadingFilterParams,
  IReadingStateCatalog,
  IUpdateReadingDto,
} from '../interfaces/ireading.interface';

@Injectable({
  providedIn: 'root',
})
export class ReadingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/readings`;

  getReadings(params?: IReadingFilterParams): Observable<IPaginatedResult<IReading>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.contratoId) {
      httpParams = httpParams.set('contratoId', params.contratoId);
    }

    return this.http.get<IPaginatedResult<IReading>>(this.endpoint, {
      params: httpParams,
    });
  }

  getReadingById(id: string | number): Observable<IReading> {
    return this.http.get<IReading>(`${this.endpoint}/${id}`);
  }

  getReadingStates(): Observable<IReadingStateCatalog[]> {
    return this.http.get<IReadingStateCatalog[]>(`${this.endpoint}/estados`);
  }

  createReading(dto: ICreateReadingDto, file?: File): Observable<IReading> {
    if (file) {
      const formData = new FormData();
      Object.entries(dto).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, String(val));
        }
      });
      formData.append('file', file, file.name);
      return this.http.post<IReading>(this.endpoint, formData);
    }
    return this.http.post<IReading>(this.endpoint, dto);
  }

  updateReading(id: string | number, dto: IUpdateReadingDto, file?: File): Observable<IReading> {
    if (file) {
      const formData = new FormData();
      Object.entries(dto).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, String(val));
        }
      });
      formData.append('file', file, file.name);
      return this.http.patch<IReading>(`${this.endpoint}/${id}`, formData);
    }
    return this.http.patch<IReading>(`${this.endpoint}/${id}`, dto);
  }

  deleteReading(id: string | number): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(`${this.endpoint}/${id}`);
  }
}
