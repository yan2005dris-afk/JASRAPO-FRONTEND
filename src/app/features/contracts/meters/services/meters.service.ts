import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IEstadoMedidor,
  IMeter,
  CrearMedidorPayload,
  ActualizarEstadoMedidorBody,
  PaginatedMetersResponse,
  SearchMetersParams,
} from '../interfaces/imeter.interface';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MetersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/meters`;

  getMeterStatuses(): Observable<IEstadoMedidor[]> {
    return this.http.get<IEstadoMedidor[]>(`${this.endpoint}/status`);
  }

  createMeter(payload: CrearMedidorPayload): Observable<IMeter> {
    return this.http.post<IMeter>(this.endpoint, payload);
  }

  getMeters(params: SearchMetersParams): Observable<PaginatedMetersResponse> {
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

    return this.http.get<PaginatedMetersResponse>(this.endpoint, { params: httpParams });
  }

  getMeterById(id: number): Observable<IMeter> {
    return this.http.get<IMeter>(`${this.endpoint}/${id}`);
  }

  updateMeter(id: number, body: ActualizarEstadoMedidorBody): Observable<IMeter> {
    return this.http.patch<IMeter>(`${this.endpoint}/${id}`, body);
  }

  deleteMeter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
