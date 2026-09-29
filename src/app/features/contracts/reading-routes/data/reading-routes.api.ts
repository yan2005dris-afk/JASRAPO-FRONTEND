import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { buildHttpParams } from '../../../../shared/utils/http-params';
import { IPaginatedResult } from '../../../billing/payments/interfaces/ipayments.interface';
import {
  ICreateRouteAssignmentsDto,
  ICreateRouteDto,
  IFilterOrdenParams,
  IFilterReadingsParams,
  IFindAllRoutesParams,
  ILecturaKpis,
  IReadingForRoute,
  IReadingRoute,
  IReassignRouteDto,
  ITipoActividad,
  IUpdateRouteDto,
  PaginatedOrdenResponse,
} from '../domain/models/reading-route.model';

@Injectable({
  providedIn: 'root',
})
export class ReadingRoutesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/routes`;

  getRoutes(params?: IFindAllRoutesParams): Observable<IPaginatedResult<IReadingRoute>> {
    return this.http.get<IPaginatedResult<IReadingRoute>>(this.endpoint, {
      params: buildHttpParams(params),
    });
  }

  getActivityTypes(): Observable<ITipoActividad[]> {
    return this.http.get<ITipoActividad[]>(`${this.endpoint}/activity-types`);
  }

  getRouteById(id: string | number): Observable<IReadingRoute> {
    return this.http.get<IReadingRoute>(`${this.endpoint}/${id}`);
  }

  getFieldSheetPdf(id: string | number): Observable<Blob> {
    return this.http.get(`${this.endpoint}/${id}/pdf`, {
      responseType: 'blob',
    });
  }

  createRoute(dto: ICreateRouteDto): Observable<IReadingRoute> {
    return this.http.post<IReadingRoute>(this.endpoint, dto);
  }

  createAssignments(dto: ICreateRouteAssignmentsDto): Observable<IReadingRoute[]> {
    return this.http.post<IReadingRoute[]>(`${this.endpoint}/assignments`, dto);
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
  ): Observable<IPaginatedResult<IReadingForRoute, ILecturaKpis>> {
    return this.http.get<IPaginatedResult<IReadingForRoute, ILecturaKpis>>(
      `${this.endpoint}/eligible-readings`,
      {
        params: buildHttpParams(params),
      },
    );
  }

  getReadingsByRuta(
    rutaId: string | number,
    params?: { page?: number; limit?: number },
  ): Observable<IPaginatedResult<IReadingForRoute, ILecturaKpis>> {
    return this.http.get<IPaginatedResult<IReadingForRoute, ILecturaKpis>>(
      `${this.endpoint}/${rutaId}/readings`,
      { params: buildHttpParams(params) },
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
    return this.http.get<PaginatedOrdenResponse>(`${this.endpoint}/${routeId}/work-orders`, {
      params: buildHttpParams(params),
    });
  }

  updateOrdenEstado(
    ordenId: string,
    estado: string,
    resultadoObservacion?: string,
  ): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/work-orders/${ordenId}/state`, {
      estado,
      resultadoObservacion,
    });
  }
}
