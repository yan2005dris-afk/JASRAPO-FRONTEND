import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IEstadoMedidor,
  IMeter,
  CrearMedidorPayload,
  ActualizarEstadoMedidorBody,
  PaginatedMetersResponse,
} from '../interfaces/imeter.interface';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MetersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/meters`;

  getEstadosMedidor(): Observable<IEstadoMedidor[]> {
    return this.http.get<IEstadoMedidor[]>(`${this.endpoint}/status`);
  }

  createMedidor(payload: CrearMedidorPayload): Observable<IMeter> {
    return this.http.post<IMeter>(this.endpoint, payload);
  }

  getMetersComponent(page = 1, limit = 10, estado?: string): Observable<PaginatedMetersResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<PaginatedMetersResponse>(this.endpoint, { params });
  }

  getMedidorById(id: number): Observable<IMeter> {
    return this.http.get<IMeter>(`${this.endpoint}/${id}`);
  }

  updateMedidor(id: number, body: ActualizarEstadoMedidorBody): Observable<IMeter> {
    return this.http.patch<IMeter>(`${this.endpoint}/${id}`, body);
  }

  deleteMedidor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
