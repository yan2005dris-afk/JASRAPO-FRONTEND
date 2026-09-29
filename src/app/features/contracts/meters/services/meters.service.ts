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
  IExportMetersParams,
  IMeterHistory,
  IReplaceMeterResponse,
} from '../domain/models/meter.model';
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

  /**
   * Descarga el inventario de medidores respetando los filtros activos.
   *
   * Se emite solo `estado` y `search`: el backend valida la query con
   * `forbidNonWhitelisted`, así que cualquier otro parámetro devuelve 400.
   * La respuesta es binaria (`responseType: 'blob'`), porque la autenticación
   * viaja como Bearer token y un enlace directo no la incluiría.
   */
  exportMeters(format: MeterExportFormat, params: IExportMetersParams): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    const search = params.search?.trim();
    if (search) {
      httpParams = httpParams.set('search', search);
    }

    return this.http.get(`${this.endpoint}/export/${format}`, {
      params: httpParams,
      responseType: 'blob',
    });
  }

  getMeterById(id: number): Observable<IMeter> {
    return this.http.get<IMeter>(`${this.endpoint}/${id}`);
  }

  getMeterHistory(id: number): Observable<IMeterHistory[]> {
    return this.http.get<IMeterHistory[]>(`${this.endpoint}/${id}/history`);
  }

  getReplacementDetail(reemplazoId: number | string): Observable<IReplaceMeterResponse> {
    return this.http.get<IReplaceMeterResponse>(`${this.endpoint}/replacements/${reemplazoId}`);
  }

  updateMeter(id: number, body: IUpdateMeterStatusBody): Observable<IMeter> {
    return this.http.patch<IMeter>(`${this.endpoint}/${id}`, body);
  }

  deleteMeter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  replaceMeter(
    payload: import('../domain/models/meter.model').IReplaceMeterRequest,
  ): Observable<import('../domain/models/meter.model').IReplaceMeterResponse> {
    return this.http.post<import('../domain/models/meter.model').IReplaceMeterResponse>(
      `${this.endpoint}/replace`,
      payload,
    );
  }
}
