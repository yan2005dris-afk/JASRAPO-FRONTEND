import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../payments/interfaces/ipayments.interface';
import {
  ICreateRubroDto,
  IRubro,
  IRubroFilterParams,
  ITarifaImpuesto,
  IUpdateRubroDto,
} from '../interfaces/irubro.interface';

@Injectable({
  providedIn: 'root',
})
export class RubrosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/rubros`;

  getRubros(params?: IRubroFilterParams): Observable<IPaginatedResult<IRubro>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.nombre) {
      httpParams = httpParams.set('nombre', params.nombre);
    }
    if (params?.tipoRubro) {
      httpParams = httpParams.set('tipoRubro', params.tipoRubro);
    }
    if (params?.tarifaImpuestoId !== undefined) {
      httpParams = httpParams.set('tarifaImpuestoId', String(params.tarifaImpuestoId));
    }
    if (params?.activo !== undefined) {
      httpParams = httpParams.set('activo', String(params.activo));
    }

    return this.http.get<IPaginatedResult<IRubro>>(this.endpoint, {
      params: httpParams,
    });
  }

  getTarifasImpuesto(): Observable<ITarifaImpuesto[]> {
    return this.http.get<ITarifaImpuesto[]>(`${this.endpoint}/tarifas-impuesto`);
  }

  getRubroById(id: number): Observable<IRubro> {
    return this.http.get<IRubro>(`${this.endpoint}/${id}`);
  }

  createRubro(dto: ICreateRubroDto): Observable<IRubro> {
    return this.http.post<IRubro>(this.endpoint, dto);
  }

  updateRubro(id: number, dto: IUpdateRubroDto): Observable<IRubro> {
    return this.http.patch<IRubro>(`${this.endpoint}/${id}`, dto);
  }

  deleteRubro(id: number): Observable<IRubro> {
    return this.http.delete<IRubro>(`${this.endpoint}/${id}`);
  }
}
