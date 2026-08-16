import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IPaginatedResult } from '../../payments/interfaces/ipayments.interface';
import {
  IBatch,
  IBatchStateOption,
  IGenerateBatchDto,
  IGenerateBatchResponse,
} from '../interfaces/ibatch.interface';

@Injectable({
  providedIn: 'root',
})
export class BatchesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/batches`;

  getBatches(params?: { page?: number; limit?: number }): Observable<IPaginatedResult<IBatch>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    return this.http.get<IPaginatedResult<IBatch>>(this.endpoint, {
      params: httpParams,
    });
  }

  getBatchById(id: number): Observable<IBatch> {
    return this.http.get<IBatch>(`${this.endpoint}/${id}`);
  }

  getBatchStates(): Observable<IBatchStateOption[]> {
    return this.http.get<IBatchStateOption[]>(`${this.endpoint}/status`);
  }

  generateBatch(dto: IGenerateBatchDto): Observable<IGenerateBatchResponse> {
    return this.http.post<IGenerateBatchResponse>(`${this.endpoint}/generate`, dto);
  }

  sendBatchEmails(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.endpoint}/${id}/send-email`, {});
  }
}
