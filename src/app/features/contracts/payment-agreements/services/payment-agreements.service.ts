import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../../billing/payments/interfaces/ipayments.interface';
import {
  IAgreement,
  ICreateAgreementDto,
  IDebtSummary,
  IFindAllAgreementsParams,
  IInstallment,
  IUpdateAgreementDto,
} from '../interfaces/ipayment-agreement.interface';

@Injectable({
  providedIn: 'root',
})
export class PaymentAgreementsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/agreements`;

  getAgreements(params?: IFindAllAgreementsParams): Observable<IPaginatedResult<IAgreement>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.contratoId) {
      httpParams = httpParams.set('contratoId', params.contratoId);
    }
    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<IPaginatedResult<IAgreement>>(this.endpoint, {
      params: httpParams,
    });
  }

  getAgreementById(id: string | number): Observable<IAgreement> {
    return this.http.get<IAgreement>(`${this.endpoint}/${id}`);
  }

  getInstallments(id: string | number): Observable<IInstallment[]> {
    return this.http.get<IInstallment[]>(`${this.endpoint}/${id}/installments`);
  }

  getDebtSummary(contratoId: string | number): Observable<IDebtSummary> {
    return this.http.get<IDebtSummary>(`${this.endpoint}/debt-summary/${contratoId}`);
  }

  getAgreementStates(): Observable<{ codigo: string; descripcion: string }[]> {
    return this.http.get<{ codigo: string; descripcion: string }[]>(`${this.endpoint}/states`);
  }

  getInstallmentStates(): Observable<{ codigo: string; descripcion: string }[]> {
    return this.http.get<{ codigo: string; descripcion: string }[]>(
      `${this.endpoint}/installment-states`,
    );
  }

  createAgreement(dto: ICreateAgreementDto): Observable<IAgreement> {
    return this.http.post<IAgreement>(this.endpoint, dto);
  }

  updateAgreement(id: string | number, dto: IUpdateAgreementDto): Observable<IAgreement> {
    return this.http.patch<IAgreement>(`${this.endpoint}/${id}`, dto);
  }

  cancelAgreement(id: string | number): Observable<IAgreement> {
    return this.http.delete<IAgreement>(`${this.endpoint}/${id}`);
  }

  getAgreementPdf(id: string | number): Observable<Blob> {
    return this.http.get(`${this.endpoint}/${id}/pdf`, { responseType: 'blob' });
  }
}
