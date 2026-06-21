import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { PaginatedResponse } from '../../../../shared/models/paginated-response';
import {
  IContract,
  IContractState,
  ICreateContractRequest,
  ISearchContractsParams,
  IUpdateContractRequest,
} from '../interfaces/icontract.interface';

@Injectable({
  providedIn: 'root',
})
export class ContractsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/contracts`;

  /** Lista contratos paginados, con filtros opcionales. */
  getContracts(params: ISearchContractsParams = {}): Observable<PaginatedResponse<IContract>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params.contratoId) {
      httpParams = httpParams.set('contratoId', params.contratoId);
    }
    if (params.medidorId) {
      httpParams = httpParams.set('medidorId', params.medidorId);
    }
    if (params.numeroGuia) {
      httpParams = httpParams.set('numeroGuia', params.numeroGuia);
    }

    return this.http.get<PaginatedResponse<IContract>>(this.endpoint, { params: httpParams });
  }

  /** Catálogo de estados de contrato. */
  getContractStates(): Observable<IContractState[]> {
    return this.http.get<IContractState[]>(`${this.endpoint}/states`);
  }

  /** Registra un nuevo contrato. */
  createContract(payload: ICreateContractRequest): Observable<IContract> {
    return this.http.post<IContract>(this.endpoint, payload);
  }

  /** Actualiza un contrato (estado, dirección, sector, medidor, lectura). */
  updateContract(id: string, payload: IUpdateContractRequest): Observable<IContract> {
    return this.http.patch<IContract>(`${this.endpoint}/${id}`, payload);
  }

  /** Obtiene un contrato por su id. */
  getContractById(id: string): Observable<IContract> {
    return this.http.get<IContract>(`${this.endpoint}/${id}`);
  }

  /** Finaliza el vínculo de un contrato. */
  finalizeContract(id: string): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/${id}/finalize`, {});
  }

  /** Descarga el PDF de solicitud de conexión (binario). */
  downloadConnectionRequestPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.endpoint}/${id}/pdf/connection-request`, {
      responseType: 'blob',
    });
  }

  /** Descarga el PDF de acuerdo de responsabilidad (binario). */
  downloadResponsibilityAgreementPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.endpoint}/${id}/pdf/responsibility-agreement`, {
      responseType: 'blob',
    });
  }
}
