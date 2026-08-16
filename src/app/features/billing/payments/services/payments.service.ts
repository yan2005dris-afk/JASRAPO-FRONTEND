import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  IApplySaldoFavorDto,
  IAnnulPaymentDto,
  IBankOption,
  ICardBrandOption,
  ICreatePaymentDto,
  IDailyCashSummary,
  IFindAllPaymentsParams,
  IPaginatedResult,
  IPayment,
  IPaymentStateOption,
  ISaldoFavor,
  IUpdatePaymentStateDto,
} from '../interfaces/ipayments.interface';

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/payments`;

  getPayments(params: IFindAllPaymentsParams): Observable<IPaginatedResult<IPayment>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params.clienteId) {
      httpParams = httpParams.set('clienteId', params.clienteId);
    }
    if (params.estadoPago) {
      httpParams = httpParams.set('estadoPago', params.estadoPago);
    }
    if (params.banco) {
      httpParams = httpParams.set('banco', params.banco);
    }
    if (params.tarjetaCredito) {
      httpParams = httpParams.set('tarjetaCredito', params.tarjetaCredito);
    }
    if (params.fechaDesde) {
      httpParams = httpParams.set('fechaDesde', params.fechaDesde);
    }
    if (params.fechaHasta) {
      httpParams = httpParams.set('fechaHasta', params.fechaHasta);
    }

    return this.http.get<IPaginatedResult<IPayment>>(this.endpoint, {
      params: httpParams,
    });
  }

  getPaymentById(id: string | number): Observable<IPayment> {
    return this.http.get<IPayment>(`${this.endpoint}/${id}`);
  }

  getPaymentStates(): Observable<IPaymentStateOption[]> {
    return this.http.get<IPaymentStateOption[]>(`${this.endpoint}/states`);
  }

  getBanks(): Observable<IBankOption[]> {
    return this.http.get<IBankOption[]>(`${this.endpoint}/banks`);
  }

  getCards(): Observable<ICardBrandOption[]> {
    return this.http.get<ICardBrandOption[]>(`${this.endpoint}/cards`);
  }

  getDailyCashSummary(params?: { fecha?: string; cajaId?: string }): Observable<IDailyCashSummary> {
    let httpParams = new HttpParams();
    if (params?.fecha) {
      httpParams = httpParams.set('fecha', params.fecha);
    }
    if (params?.cajaId) {
      httpParams = httpParams.set('cajaId', params.cajaId);
    }
    return this.http.get<IDailyCashSummary>(`${this.endpoint}/cuadro-diario`, {
      params: httpParams,
    });
  }

  getSaldoFavorByCliente(clienteId: string | number): Observable<ISaldoFavor[]> {
    return this.http.get<ISaldoFavor[]>(`${this.endpoint}/cliente/${clienteId}/saldo-favor`);
  }

  createPayment(dto: ICreatePaymentDto): Observable<IPayment> {
    return this.http.post<IPayment>(this.endpoint, dto);
  }

  applySaldoFavor(dto: IApplySaldoFavorDto): Observable<IPayment> {
    return this.http.post<IPayment>(`${this.endpoint}/apply-saldo-favor`, dto);
  }

  updatePaymentState(id: string | number, dto: IUpdatePaymentStateDto): Observable<IPayment> {
    return this.http.patch<IPayment>(`${this.endpoint}/${id}/state`, dto);
  }

  annulPayment(id: string | number, dto: IAnnulPaymentDto): Observable<IPayment> {
    return this.http.delete<IPayment>(`${this.endpoint}/${id}`, {
      body: dto,
    });
  }
}
