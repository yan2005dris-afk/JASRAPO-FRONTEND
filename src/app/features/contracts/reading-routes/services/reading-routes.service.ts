import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../../billing/payments/interfaces/ipayments.interface';
import {
  ICreateRouteDto,
  IFilterReadingsParams,
  IFindAllRoutesParams,
  IReadingForRoute,
  IReadingRoute,
  IReassignRouteDto,
  IUpdateRouteDto,
} from '../interfaces/ireading-route.interface';

@Injectable({
  providedIn: 'root',
})
export class ReadingRoutesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/routes`;

  getRoutes(params?: IFindAllRoutesParams): Observable<IPaginatedResult<IReadingRoute>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    if (params?.operarioId) {
      httpParams = httpParams.set('operarioId', String(params.operarioId));
    }
    if (params?.comunidadId) {
      httpParams = httpParams.set('comunidadId', String(params.comunidadId));
    }
    if (params?.periodoId) {
      httpParams = httpParams.set('periodoId', String(params.periodoId));
    }

    return this.http.get<IPaginatedResult<IReadingRoute>>(this.endpoint, {
      params: httpParams,
    });
  }

  getRouteById(id: string | number): Observable<IReadingRoute> {
    return this.http.get<IReadingRoute>(`${this.endpoint}/${id}`);
  }

  createRoute(dto: ICreateRouteDto): Observable<IReadingRoute> {
    return this.http.post<IReadingRoute>(this.endpoint, dto);
  }

  updateRoute(id: string | number, dto: IUpdateRouteDto): Observable<IReadingRoute> {
    return this.http.patch<IReadingRoute>(`${this.endpoint}/${id}`, dto);
  }

  reassignRoute(id: string | number, dto: IReassignRouteDto): Observable<IReadingRoute> {
    return this.http.patch<IReadingRoute>(`${this.endpoint}/${id}/reassign`, dto);
  }

  deleteRoute(id: string | number): Observable<IReadingRoute> {
    return this.http.delete<IReadingRoute>(`${this.endpoint}/${id}`);
  }

  getEligibleReadings(params?: IFilterReadingsParams): Observable<IPaginatedResult<IReadingForRoute>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.comunidadId) {
      httpParams = httpParams.set('comunidadId', String(params.comunidadId));
    }
    if (params?.sectorId) {
      httpParams = httpParams.set('sectorId', String(params.sectorId));
    }
    if (params?.periodoId) {
      httpParams = httpParams.set('periodoId', String(params.periodoId));
    }

    return this.http.get<IPaginatedResult<IReadingForRoute>>(
      `${this.endpoint}/eligible-readings`,
      { params: httpParams },
    );
  }
}
