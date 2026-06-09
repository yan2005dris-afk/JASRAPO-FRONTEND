import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  ActualizarClienteRequest,
  BuscarClientesParams,
  CrearClienteRequest,
  IClientes,
  IIdentificacion,
} from '../interfaces/iclientes.interface';

import { environment } from '../../../../../environments/environment';

type ClientesApiResponse =
  | IClientes[]
  | {
      data?: IClientes[];
      clientes?: IClientes[];
      items?: IClientes[];
      results?: IClientes[];
      content?: IClientes[];
    };

@Injectable({
  providedIn: 'root',
})
export class ClientesService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/clients`;

  getAllClientes(): Observable<IClientes[]> {
    return this.http
      .get<ClientesApiResponse>(this.endpoint)
      .pipe(map((response) => this.normalizarRespuestaClientes(response)));
  }

  buscarClientes(params: BuscarClientesParams): Observable<IClientes[]> {
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

    return this.http
      .get<ClientesApiResponse>(this.endpoint, {
        params: httpParams,
      })
      .pipe(map((response) => this.normalizarRespuestaClientes(response)));
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
    return this.http
      .get<any>(`${this.endpoint}/identification-types`)
      .pipe(map((response) => this.normalizarRespuestaGenerica<IIdentificacion>(response)));
  }

  private normalizarRespuestaClientes(response: ClientesApiResponse): IClientes[] {
    return this.normalizarRespuestaGenerica<IClientes>(response);
  }

  private normalizarRespuestaGenerica<T>(response: any): T[] {
    if (Array.isArray(response)) {
      return response;
    }
    return (
      response?.data ??
      response?.clientes ??
      response?.items ??
      response?.results ??
      response?.content ??
      []
    );
  }
}
