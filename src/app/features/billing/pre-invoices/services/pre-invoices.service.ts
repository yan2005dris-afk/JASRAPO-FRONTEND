import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../payments/interfaces/ipayments.interface';
import {
  IFindAllPreInvoicesParams,
  IPreInvoice,
  IPreInvoiceStateOption,
  ISendPreInvoiceEmailResponse,
  IUpdatePreInvoiceStateDto,
} from '../interfaces/ipre-invoice.interface';

@Injectable({
  providedIn: 'root',
})
export class PreInvoicesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/pre-invoices`;

  getPreInvoices(params: IFindAllPreInvoicesParams): Observable<IPaginatedResult<IPreInvoice>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params.loteId !== undefined) {
      httpParams = httpParams.set('loteId', String(params.loteId));
    }
    if (params.periodoId !== undefined) {
      httpParams = httpParams.set('periodoId', String(params.periodoId));
    }
    if (params.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    if (params.contratoId) {
      httpParams = httpParams.set('contratoId', params.contratoId);
    }
    if (params.identificacion) {
      httpParams = httpParams.set('identificacion', params.identificacion);
    }
    if (params.fechaDesde) {
      httpParams = httpParams.set('fechaDesde', params.fechaDesde);
    }
    if (params.fechaHasta) {
      httpParams = httpParams.set('fechaHasta', params.fechaHasta);
    }

    return this.http.get<IPaginatedResult<IPreInvoice>>(this.endpoint, {
      params: httpParams,
    });
  }

  getPreInvoiceById(id: number): Observable<IPreInvoice> {
    return this.http.get<IPreInvoice>(`${this.endpoint}/${id}`);
  }

  getPreInvoiceStates(): Observable<IPreInvoiceStateOption[]> {
    return this.http.get<IPreInvoiceStateOption[]>(`${this.endpoint}/estados`);
  }

  getPreInvoicePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.endpoint}/${id}/pdf`, {
      responseType: 'blob',
    });
  }

  sendPreInvoiceEmail(id: number): Observable<ISendPreInvoiceEmailResponse> {
    return this.http.post<ISendPreInvoiceEmailResponse>(`${this.endpoint}/${id}/send-email`, {});
  }

  updatePreInvoiceState(id: number, dto: IUpdatePreInvoiceStateDto): Observable<IPreInvoice> {
    return this.http.patch<IPreInvoice>(`${this.endpoint}/${id}/state`, dto);
  }
}
