import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IPaginatedResult } from '../../features/billing/payments/interfaces/ipayments.interface';

export type EstadoPeriodo = 'ABIERTO' | 'CERRADO' | 'PROCESANDO';

export interface IAccountingPeriod {
  periodoId: number;
  nombre?: string;
  estado: string;
}

export interface IPeriod {
  periodoId: number;
  nombre: string;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  fechaVencimiento: string | Date;
  estado: EstadoPeriodo;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICreatePeriodDto {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  fechaVencimiento: string;
  estado?: EstadoPeriodo;
}

export interface IUpdatePeriodDto {
  nombre?: string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaVencimiento?: string;
  estado?: EstadoPeriodo;
}

export interface IGenerateAnnualPeriodsDto {
  year: number;
  diaVencimiento?: number;
  estadoInicial?: EstadoPeriodo;
}

export interface IPeriodFilters {
  page?: number;
  limit?: number;
  estado?: string;
  search?: string;
  year?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PeriodsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/periods`;

  /**
   * Obtiene la lista simple de periodos contables para selectores / pickers
   */
  getPeriods(): Observable<IAccountingPeriod[]> {
    return this.http.get<IAccountingPeriod[]>(`${this.baseUrl}/routes/periods`);
  }

  /**
   * Lista paginada con filtros completos para administración de periodos
   */
  getAllPeriods(filters?: IPeriodFilters): Observable<IPaginatedResult<IPeriod>> {
    let params = new HttpParams();
    if (filters?.page !== undefined) {
      params = params.set('page', String(filters.page));
    }
    if (filters?.limit !== undefined) {
      params = params.set('limit', String(filters.limit));
    }
    if (filters?.estado) {
      params = params.set('estado', filters.estado);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<IPaginatedResult<IPeriod>>(this.endpoint, { params });
  }

  getPeriodById(id: number): Observable<IPeriod> {
    return this.http.get<IPeriod>(`${this.endpoint}/${id}`);
  }

  createPeriod(dto: ICreatePeriodDto): Observable<IPeriod> {
    return this.http.post<IPeriod>(this.endpoint, dto);
  }

  generateAnnualPeriods(dto: IGenerateAnnualPeriodsDto): Observable<IPeriod[]> {
    return this.http.post<IPeriod[]>(`${this.endpoint}/generate-year`, dto);
  }

  updatePeriod(id: number, dto: IUpdatePeriodDto): Observable<IPeriod> {
    return this.http.patch<IPeriod>(`${this.endpoint}/${id}`, dto);
  }

  deletePeriod(id: number): Observable<IPeriod> {
    return this.http.delete<IPeriod>(`${this.endpoint}/${id}`);
  }
}
