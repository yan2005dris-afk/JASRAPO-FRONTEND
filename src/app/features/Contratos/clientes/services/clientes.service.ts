import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ActualizarClienteRequest,
  BuscarClientesParams,
  CrearClienteRequest,
  IClientes,
  IIdentificacion,
} from '../interfaces/iclientes.interface';

import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClientesService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/clients`;

  getAllClientes(): Observable<unknown> {
    return this.http.get<unknown>(this.endpoint);
  }

  buscarClientes(params: BuscarClientesParams): Observable<unknown> {
    let httpParams = new HttpParams();

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

    return this.http.get<unknown>(this.endpoint, {
      params: httpParams,
    });
  }

  getClienteById(id: string | number): Observable<IClientes> {
    return this.http.get<IClientes>(`${this.endpoint}/${id}`);
  }

  createCliente(cliente: CrearClienteRequest): Observable<IClientes> {
    return this.http.post<IClientes>(this.endpoint, cliente);
  }

  updateCliente(id: string | number, cliente: ActualizarClienteRequest): Observable<IClientes> {
    return this.http.patch<IClientes>(`${this.endpoint}/${id}`, cliente);
  }

  deleteCliente(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  getTiposIdentificacion(): Observable<IIdentificacion[]> {
    return this.http.get<IIdentificacion[]>(`${this.endpoint}/identification-types`);
  }
}
