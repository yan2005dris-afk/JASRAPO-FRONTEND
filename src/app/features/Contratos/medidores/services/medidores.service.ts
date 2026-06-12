import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IEstadoMedidor,
  IMedidor,
  CrearMedidorPayload,
  ActualizarEstadoMedidorBody,
  PaginatedMetersResponse,
} from '../interfaces/imedidor.interface';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MedidoresService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/meters`;

  getEstadosMedidor(): Observable<IEstadoMedidor[]> {
    return this.http.get<IEstadoMedidor[]>(`${this.endpoint}/status`);
  }

  createMedidor(payload: CrearMedidorPayload): Observable<IMedidor> {
    return this.http.post<IMedidor>(this.endpoint, payload);
  }

  getMedidores(page = 1, limit = 10, estado?: string): Observable<PaginatedMetersResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<PaginatedMetersResponse>(this.endpoint, { params });
  }

  getMedidorById(id: number): Observable<IMedidor> {
    return this.http.get<IMedidor>(`${this.endpoint}/${id}`);
  }

  updateMedidor(id: number, body: ActualizarEstadoMedidorBody): Observable<IMedidor> {
    return this.http.patch<IMedidor>(`${this.endpoint}/${id}`, body);
  }

  deleteMedidor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
