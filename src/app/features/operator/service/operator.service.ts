import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { OperatorRouteResponse, ReadingWithAnomaly } from '../models/operator.models';

/** Respuesta del endpoint GET /operator/readings */
export interface OperatorReadingResponse {
  lecturaId: string;
  medidorId: string;
  medidorSerie?: string;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoCalculado?: number;
  fecha: string;
  estado: string;
  descripcionAnomalia?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OperatorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/operator`;

  /** GET /api/v1/operator/routes — Listar rutas asignadas al operario */
  getRoutes(tipoRuta?: string): Observable<OperatorRouteResponse[]> {
    let params = new HttpParams();
    if (tipoRuta) {
      params = params.set('tipoRuta', tipoRuta);
    }
    return this.http.get<OperatorRouteResponse[]>(`${this.endpoint}/routes`, { params });
  }

  /** Alias de compatibilidad */
  getTasks(tipoRuta?: string): Observable<OperatorRouteResponse[]> {
    return this.getRoutes(tipoRuta);
  }

  /** PATCH /api/v1/operator/routes/{id}/state — Actualizar estado de una ruta */
  updateRouteState(
    rutaId: string,
    dto: { estado: string; observacion?: string },
  ): Observable<unknown> {
    return this.http.patch<unknown>(`${this.endpoint}/routes/${rutaId}/state`, dto);
  }

  /** Alias de compatibilidad */
  updateTaskState(
    rutaId: string,
    dto: { estado: string; observacion?: string },
  ): Observable<unknown> {
    return this.updateRouteState(rutaId, dto);
  }

  /** GET /api/v1/operator/readings — Listar lecturas del operario (período actual) */
  getReadings(): Observable<OperatorReadingResponse[]> {
    return this.http.get<OperatorReadingResponse[]>(`${this.endpoint}/readings`);
  }

  /** GET /api/v1/operator/readings/anomalies — Lecturas con anomalías pendientes */
  getReadingsWithAnomalies(): Observable<ReadingWithAnomaly[]> {
    return this.http.get<ReadingWithAnomaly[]>(`${this.endpoint}/readings/anomalies`);
  }
}
