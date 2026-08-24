import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  UpdateClientRequest,
  SearchClientsParams,
  CreateClientRequest,
  IClient,
  IIdentificacion,
  IPaginatedResult,
} from '../interfaces/iclients.interface';

import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClientsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/clients`;

  searchClients(params: SearchClientsParams): Observable<IPaginatedResult<IClient>> {
    let httpParams = new HttpParams();

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params.nombreCompleto) {
      httpParams = httpParams.set('nombreCompleto', params.nombreCompleto);
    }

    if (params.identificacion) {
      httpParams = httpParams.set('identificacion', params.identificacion);
    }

    if (params.nombres) {
      httpParams = httpParams.set('nombres', params.nombres);
    }

    if (params.apellidos) {
      httpParams = httpParams.set('apellidos', params.apellidos);
    }

    if (params.activo !== undefined) {
      httpParams = httpParams.set('activo', String(params.activo));
    }

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }

    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    return this.http.get<IPaginatedResult<IClient>>(this.endpoint, {
      params: httpParams,
    });
  }

  getClientById(id: string | number): Observable<IClient> {
    return this.http.get<IClient>(`${this.endpoint}/${id}`);
  }

  createClient(cliente: CreateClientRequest): Observable<IClient> {
    return this.http.post<IClient>(this.endpoint, cliente);
  }

  updateClient(id: string | number, cliente: UpdateClientRequest): Observable<IClient> {
    return this.http.patch<IClient>(`${this.endpoint}/${id}`, cliente);
  }

  deleteClient(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getIdentificationTypes(): Observable<IIdentificacion[]> {
    return this.http.get<IIdentificacion[]>(`${this.endpoint}/identification-types`);
  }
}
