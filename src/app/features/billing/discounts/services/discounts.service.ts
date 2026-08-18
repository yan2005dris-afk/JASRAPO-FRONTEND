import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../payments/interfaces/ipayments.interface';
import {
  IApplyDiscountToPreinvoiceDto,
  ICreateDiscountDto,
  IDiscount,
  IDiscountFilterParams,
  IUpdateDiscountDto,
} from '../interfaces/idiscount.interface';

@Injectable({
  providedIn: 'root',
})
export class DiscountsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/discounts`;

  getDiscounts(params?: IDiscountFilterParams): Observable<IPaginatedResult<IDiscount>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params?.nombre) {
      httpParams = httpParams.set('nombre', params.nombre);
    }
    if (params?.tipoDescuento) {
      httpParams = httpParams.set('tipoDescuento', params.tipoDescuento);
    }
    if (params?.activo !== undefined) {
      httpParams = httpParams.set('activo', String(params.activo));
    }
    if (params?.aplicaAutomatico !== undefined) {
      httpParams = httpParams.set('aplicaAutomatico', String(params.aplicaAutomatico));
    }

    return this.http.get<IPaginatedResult<IDiscount>>(this.endpoint, {
      params: httpParams,
    });
  }

  getRubros(): Observable<
    { rubroId: number; nombre: string; tipoRubro: string; precioUnitario: any }[]
  > {
    return this.http.get<
      { rubroId: number; nombre: string; tipoRubro: string; precioUnitario: any }[]
    >(`${this.endpoint}/rubros`);
  }

  getDiscountById(id: number): Observable<IDiscount> {
    return this.http.get<IDiscount>(`${this.endpoint}/${id}`);
  }

  createDiscount(dto: ICreateDiscountDto): Observable<IDiscount> {
    return this.http.post<IDiscount>(this.endpoint, dto);
  }

  updateDiscount(id: number, dto: IUpdateDiscountDto): Observable<IDiscount> {
    return this.http.patch<IDiscount>(`${this.endpoint}/${id}`, dto);
  }

  deleteDiscount(id: number): Observable<IDiscount> {
    return this.http.delete<IDiscount>(`${this.endpoint}/${id}`);
  }

  applyDiscountToPreinvoice(
    prefacturaId: number,
    dto: IApplyDiscountToPreinvoiceDto,
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.endpoint}/apply-to-preinvoice/${prefacturaId}`,
      dto,
    );
  }
}
