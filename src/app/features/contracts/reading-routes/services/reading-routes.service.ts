import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../../billing/payments/interfaces/ipayments.interface';
import {
  ICreateRouteDto,
  IFilterOrdenParams,
  IFilterReadingsParams,
  IFindAllRoutesParams,
  IReadingForRoute,
  IReadingRoute,
  IReassignRouteDto,
  IUpdateRouteDto,
  PaginatedOrdenResponse,
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

  getPeriods(): Observable<{ periodoId: number; nombre?: string; estado: string }[]> {
    return this.http.get<{ periodoId: number; nombre?: string; estado: string }[]>(
      `${this.endpoint}/periods`,
    );
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

  getEligibleReadings(
    params?: IFilterReadingsParams,
  ): Observable<IPaginatedResult<IReadingForRoute, { aprobadas?: number }>> {
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
    if (params?.tipoRuta) {
      httpParams = httpParams.set('tipoRuta', String(params.tipoRuta));
    }
    if (params?.fechaPlanificada) {
      httpParams = httpParams.set('fechaPlanificada', String(params.fechaPlanificada));
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<IPaginatedResult<IReadingForRoute, { aprobadas?: number }>>(
      `${this.endpoint}/eligible-readings`,
      {
        params: httpParams,
      },
    );
  }

  getReadingsByRuta(
    rutaId: string | number,
    params?: { page?: number; limit?: number },
  ): Observable<IPaginatedResult<IReadingForRoute, { aprobadas?: number }>> {
    let httpParams = new HttpParams();
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    return this.http.get<IPaginatedResult<IReadingForRoute, { aprobadas?: number }>>(
      `${this.endpoint}/${rutaId}/readings`,
      { params: httpParams },
    );
  }

  updateReadingStatus(
    lecturaId: string | number,
    estado: 'APROBADA' | 'CON_NOVEDAD' | 'RECHAZADA_VERIFICACION' | 'PENDIENTE' | 'POR_REVISION',
  ): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/readings/${lecturaId}`, {
      estado,
    });
  }

  getOrdenesByRuta(
    routeId: string | number,
    params?: IFilterOrdenParams,
  ): Observable<PaginatedOrdenResponse> {
    let httpParams = new HttpParams();

    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    return this.http.get<PaginatedOrdenResponse>(`${this.endpoint}/${routeId}/ordenes`, {
      params: httpParams,
    });
  }

  updateOrdenEstado(
    ordenId: string,
    estado: string,
    resultadoObservacion?: string,
  ): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/ordenes/${ordenId}/estado`, {
      estado,
      resultadoObservacion,
    });
  }
}
