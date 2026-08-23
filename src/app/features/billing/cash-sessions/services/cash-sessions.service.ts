import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ICashSession,
  IOpenCashSessionDto,
  ICreateCashMovementDto,
  ICloseCashSessionDto,
  ICashMovement,
} from '../interfaces/icash-session.interface';

@Injectable({
  providedIn: 'root',
})
export class CashSessionsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cash-sessions`;

  getCurrentSession(): Observable<ICashSession | null> {
    return this.http.get<ICashSession | null>(`${this.apiUrl}/current`, {
      withCredentials: true,
    });
  }

  openSession(dto: IOpenCashSessionDto): Observable<ICashSession> {
    return this.http.post<ICashSession>(`${this.apiUrl}/open`, dto, {
      withCredentials: true,
    });
  }

  addMovement(cajaId: string, dto: ICreateCashMovementDto): Observable<ICashMovement> {
    return this.http.post<ICashMovement>(`${this.apiUrl}/${cajaId}/movements`, dto, {
      withCredentials: true,
    });
  }

  closeSession(
    cajaId: string,
    dto: ICloseCashSessionDto,
  ): Observable<{ estado: string; novedadCierre?: string }> {
    return this.http.post<{ estado: string; novedadCierre?: string }>(
      `${this.apiUrl}/${cajaId}/close`,
      dto,
      {
        withCredentials: true,
      },
    );
  }

  getHistory(limit = 20, page = 1): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/history`, {
      params: { limit: String(limit), page: String(page) },
      withCredentials: true,
    });
  }
}
