import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { TaskResponse, ReadingWithAnomaly } from '../models/operator.models';

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

  /** GET /api/v1/operator/sync — Sincronización offline de medidores */
  syncAllMeters(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.endpoint}/sync`);
  }

  /** GET /api/v1/operator/tasks — Listar tareas/rutas asignadas al operario */
  getTasks(tipoRuta?: string): Observable<TaskResponse[]> {
    let params = new HttpParams();
    if (tipoRuta) {
      params = params.set('tipoRuta', tipoRuta);
    }
    return this.http.get<TaskResponse[]>(`${this.endpoint}/tasks`, { params });
  }

  /** PATCH /api/v1/operator/tasks/{id} — Actualizar estado de una tarea */
  updateTaskState(
    rutaId: string,
    dto: { estado: string; observacion?: string },
  ): Observable<unknown> {
    return this.http.patch<unknown>(`${this.endpoint}/tasks/${rutaId}`, dto);
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
