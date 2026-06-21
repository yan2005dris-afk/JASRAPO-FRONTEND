import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { TaskResponse, ReadingWithAnomaly } from '../models/operator.models';

@Injectable({
  providedIn: 'root',
})
export class OperatorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/operator`;

  syncAllMeters(): Observable<any[]> {
    return this.http.get<any[]>(`${this.endpoint}/sync`);
  }

  getTasks(tipoRuta?: string): Observable<TaskResponse[]> {
    let params = new HttpParams();
    if (tipoRuta) {
      params = params.set('tipoRuta', tipoRuta);
    }
    return this.http.get<TaskResponse[]>(`${this.endpoint}/tasks`, { params });
  }

  updateTaskState(
    rutaId: string,
    dto: { estado: string; observacion?: string },
  ): Observable<unknown> {
    return this.http.patch<unknown>(`${this.endpoint}/tasks/${rutaId}/state`, dto);
  }

  getReadingsWithAnomalies(): Observable<ReadingWithAnomaly[]> {
    return this.http.get<ReadingWithAnomaly[]>(`${this.baseUrl}/operator/readings/anomalies`);
  }
}