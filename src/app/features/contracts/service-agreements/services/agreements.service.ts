import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { PaginatedResponse } from '../../../../shared/models/paginated-response';
import { IAgreementSummary, ISearchAgreementsParams } from '../interfaces/iagreement.interface';

@Injectable({
  providedIn: 'root',
})
export class AgreementsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/agreements`;

  /** Lista convenios paginados, con filtros opcionales. */
  getAgreements(
    params: ISearchAgreementsParams = {},
  ): Observable<PaginatedResponse<IAgreementSummary>> {
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
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<PaginatedResponse<IAgreementSummary>>(this.endpoint, {
      params: httpParams,
    });
  }
}
