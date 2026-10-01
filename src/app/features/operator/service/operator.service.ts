import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  OperatorRouteResponse,
  ReadingWithAnomaly,
  OperatorActivityType,
} from '../models/operator.models';

@Injectable({
  providedIn: 'root',
})
export class OperatorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/operator`;

  /** GET /api/v1/operator/activity-types — Listar tipos de actividad disponibles */
  getActivityTypes(): Observable<OperatorActivityType[]> {
    return this.http.get<OperatorActivityType[]>(`${this.endpoint}/activity-types`);
  }

  /** GET /api/v1/operator/routes — Listar rutas asignadas al operario */
  getRoutes(tipoRuta?: string): Observable<OperatorRouteResponse[]> {
    let params = new HttpParams();
    if (tipoRuta) {
      params = params.set('tipoRuta', tipoRuta);
    }
    return this.http.get<OperatorRouteResponse[]>(`${this.endpoint}/routes`, { params });
  }

  /** PATCH /api/v1/operator/routes/{id}/state — Actualizar estado de una ruta */
  updateRouteState(
    rutaId: string,
    dto: { estado: string; observacion?: string },
  ): Observable<unknown> {
    return this.http.patch<unknown>(`${this.endpoint}/routes/${rutaId}/state`, dto);
  }

  /** GET /api/v1/operator/readings/anomalies — Lecturas con anomalías pendientes */
  getReadingsWithAnomalies(): Observable<ReadingWithAnomaly[]> {
    return this.http.get<ReadingWithAnomaly[]>(`${this.endpoint}/readings/anomalies`);
  }
}
