import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IMeterStatus,
  IMeter,
  ICreateMeterPayload,
  IUpdateMeterStatusBody,
  IPaginatedMetersResponse,
  ISearchMetersParams,
} from '../interfaces/imeter.interface';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MetersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/meters`;

  getMeterStatuses(): Observable<IMeterStatus[]> {
    return this.http.get<IMeterStatus[]>(`${this.endpoint}/status`);
  }

  createMeter(payload: ICreateMeterPayload): Observable<IMeter> {
    return this.http.post<IMeter>(this.endpoint, payload);
  }

  getMeters(params: ISearchMetersParams): Observable<IPaginatedMetersResponse> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params.estado !== undefined) {
      httpParams = httpParams.set('estado', String(params.estado));
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<IPaginatedMetersResponse>(this.endpoint, { params: httpParams });
  }

  getMeterById(id: number): Observable<IMeter> {
    return this.http.get<IMeter>(`${this.endpoint}/${id}`);
  }

  updateMeter(id: number, body: IUpdateMeterStatusBody): Observable<IMeter> {
    return this.http.patch<IMeter>(`${this.endpoint}/${id}`, body);
  }

  deleteMeter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  replaceMeter(
    payload: import('../interfaces/imeter.interface').IReplaceMeterRequest,
  ): Observable<import('../interfaces/imeter.interface').IReplaceMeterResponse> {
    return this.http.post<import('../interfaces/imeter.interface').IReplaceMeterResponse>(
      `${this.endpoint}/replace`,
      payload,
    );
  }
}
