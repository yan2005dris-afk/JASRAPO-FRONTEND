import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../../billing/payments/interfaces/ipayments.interface';
import {
  ICreateReadingAnomalyDto,
  IReadingAnomaly,
  IReadingAnomalyFilterParams,
  IUpdateReadingAnomalyDto,
} from '../interfaces/ianomaly.interface';

@Injectable({
  providedIn: 'root',
})
export class ReadingAnomaliesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/work-order-novelties`;

  private mapNoveltyToAnomaly(item: any): IReadingAnomaly {
    const id = String(item.novedadId ?? item.anomaliaId ?? '');
    return {
      anomaliaId: id,
      novedadId: id,
      ordenTrabajoId: item.ordenTrabajoId ? String(item.ordenTrabajoId) : undefined,
      lecturaId: item.lecturaId ? String(item.lecturaId) : null,
      observacion: item.observacion ?? null,
      tipo: item.tipo,
      estado: item.estado,
      resolucionTipo: item.resolucionTipo ?? null,
      consumoAjustado: item.consumoAjustado !== undefined ? Number(item.consumoAjustado) : null,
      observacionResolucion: item.observacionResolucion ?? null,
      fotoUrl: item.fotoUrl ?? null,
      lectura: item.lectura ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  getAnomalies(
    params?: IReadingAnomalyFilterParams,
  ): Observable<IPaginatedResult<IReadingAnomaly>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.ordenTrabajoId) {
      httpParams = httpParams.set('ordenTrabajoId', params.ordenTrabajoId);
    }
    if (params?.lecturaId) {
      httpParams = httpParams.set('lecturaId', params.lecturaId);
    }
    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }

    return this.http
      .get<{ data: any[]; total?: number; meta?: { totalItems: number } }>(this.endpoint, {
        params: httpParams,
      })
      .pipe(
        map((res) => {
          const total = res.total ?? res.meta?.totalItems ?? res.data.length;
          const mappedData = res.data.map((item) => this.mapNoveltyToAnomaly(item));
          return {
            data: mappedData,
            meta: {
              itemCount: mappedData.length,
              totalItems: total,
              itemsPerPage: params?.limit ?? 10,
              totalPages: Math.ceil(total / (params?.limit ?? 10)) || 1,
              currentPage: params?.page ?? 1,
            },
          };
        }),
      );
  }

  getAnomalyById(id: string | number): Observable<IReadingAnomaly> {
    return this.http
      .get<any>(`${this.endpoint}/${id}`)
      .pipe(map((item) => this.mapNoveltyToAnomaly(item)));
  }

  getAnomalyStates(): Observable<{ codigo: string; nombre: string; icono?: string }[]> {
    return this.http.get<{ codigo: string; nombre: string; icono?: string }[]>(
      `${this.baseUrl}/work-orders/estados`,
    );
  }

  createAnomaly(dto: ICreateReadingAnomalyDto, file?: File): Observable<IReadingAnomaly> {
    const formData = new FormData();
    if (dto.ordenTrabajoId !== undefined && dto.ordenTrabajoId !== null) {
      formData.append('ordenTrabajoId', String(dto.ordenTrabajoId));
    }
    if (dto.lecturaId !== undefined && dto.lecturaId !== null) {
      formData.append('lecturaId', String(dto.lecturaId));
    }
    if (dto.tipo) {
      formData.append('tipo', String(dto.tipo));
    }
    if (dto.observacion) {
      formData.append('observacion', String(dto.observacion));
    }
    if (file) {
      formData.append('file', file, file.name);
    }

    return this.http
      .post<any>(this.endpoint, formData)
      .pipe(map((item) => this.mapNoveltyToAnomaly(item)));
  }

  updateAnomaly(
    id: string | number,
    dto: IUpdateReadingAnomalyDto,
    file?: File,
  ): Observable<IReadingAnomaly> {
    const formData = new FormData();
    if (dto.tipo !== undefined) formData.append('tipo', String(dto.tipo));
    if (dto.observacion !== undefined) formData.append('observacion', String(dto.observacion));
    if (dto.estado !== undefined) formData.append('estado', String(dto.estado));
    if (dto.resolucionTipo !== undefined) {
      formData.append('resolucionTipo', String(dto.resolucionTipo));
    }
    if (dto.consumoAjustado !== undefined && dto.consumoAjustado !== null) {
      formData.append('consumoAjustado', String(dto.consumoAjustado));
    }
    if (dto.observacionResolucion !== undefined) {
      formData.append('observacionResolucion', String(dto.observacionResolucion));
    }
    if (file) {
      formData.append('file', file, file.name);
    }

    return this.http
      .patch<any>(`${this.endpoint}/${id}`, formData)
      .pipe(map((item) => this.mapNoveltyToAnomaly(item)));
  }

  deleteAnomaly(id: string | number): Observable<{ message?: string }> {
    return this.http.patch<{ message?: string }>(`${this.endpoint}/${id}`, {
      estado: 'CANCELLED',
    });
  }
}
