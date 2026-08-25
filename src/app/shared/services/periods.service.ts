import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IAccountingPeriod {
  periodoId: number;
  nombre?: string;
  estado: string;
}

/**
 * Servicio centralizado para períodos contables.
 *
 * Históricamente `getPeriods()` vivía en `ReadingRoutesService`, lo cual era
 * un leakage de dominio: los períodos contables son un recurso transversal
 * (lecturas, rutas, lotes, prefacturas), no algo propio de "rutas de lectura".
 *
 * Este servicio expone el endpoint compartido `GET /routes/periods` y es el
 * único punto de acceso para el recurso `IAccountingPeriod` desde el frontend.
 */
@Injectable({
  providedIn: 'root',
})
export class PeriodsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getPeriods(): Observable<IAccountingPeriod[]> {
    return this.http.get<IAccountingPeriod[]>(`${this.baseUrl}/routes/periods`);
  }
}
