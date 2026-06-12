import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Comunidad, PaginatedComunidadesResponse } from '../models/comunidad.interface';

type RawDecimalValue = number | string | { s: number; e: number; d: number[] };

interface RawComunidad {
  comunidadId: number;
  nombre: string;
  codigo: string;
  porcentajeTasaSeguridad: RawDecimalValue;
  [key: string]: unknown;
}

const normalizePorcentaje = (value: RawDecimalValue): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === 'object' && Array.isArray((value as { d: unknown }).d)) {
    const decimal = value as { s?: number; e?: number; d: number[] };
    const digits = decimal.d.join('');
    const sign = decimal.s === -1 ? -1 : 1;
    const exponent = decimal.e ?? 0;
    const intValue = Number(digits);
    if (Number.isNaN(intValue)) {
      return 0;
    }
    return sign * intValue * Math.pow(10, exponent - (digits.length - 1));
  }

  return 0;
};

const normalizeComunidad = (raw: RawComunidad): Comunidad => ({
  id: raw.comunidadId,
  nombre: raw.nombre,
  codigo: raw.codigo,
  porcentajeTasaSeguridad: normalizePorcentaje(raw.porcentajeTasaSeguridad),
});

@Injectable({
  providedIn: 'root',
})
export class ComunidadesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/communities`;

  getAllComunidades(page = 1, limit = 10): Observable<PaginatedComunidadesResponse> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    return this.http
      .get<{
        data: RawComunidad[];
        meta: PaginatedComunidadesResponse['meta'];
      }>(this.apiUrl, { params })
      .pipe(
        map((response) => ({
          data: response.data.map(normalizeComunidad),
          meta: response.meta,
        })),
      );
  }

  getComunidadById(id: number): Observable<Comunidad> {
    return this.http.get<RawComunidad>(`${this.apiUrl}/${id}`).pipe(map(normalizeComunidad));
  }

  createComunidad(comunidad: Omit<Comunidad, 'id'>): Observable<Comunidad> {
    return this.http.post<RawComunidad>(this.apiUrl, comunidad).pipe(map(normalizeComunidad));
  }

  updateComunidad(id: number, comunidad: Omit<Comunidad, 'id'>): Observable<Comunidad> {
    return this.http
      .patch<RawComunidad>(`${this.apiUrl}/${id}`, comunidad)
      .pipe(map(normalizeComunidad));
  }
}
