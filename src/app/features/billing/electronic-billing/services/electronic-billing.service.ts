import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  IComprobante,
  IPaginatedComprobantes,
  IQueryComprobantesParams,
} from '../interfaces/ielectronic-billing.interface';

@Injectable({
  providedIn: 'root',
})
export class ElectronicBillingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/sri`;

  getComprobantes(params: IQueryComprobantesParams): Observable<IPaginatedComprobantes> {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http.get<IPaginatedComprobantes>(`${this.endpoint}/comprobantes`, {
      params: httpParams,
    });
  }

  getComprobanteByClaveAcceso(claveAcceso: string): Observable<IComprobante> {
    return this.http.get<IComprobante>(`${this.endpoint}/comprobantes/${claveAcceso}`);
  }

  getXmlAutorizado(claveAcceso: string): Observable<Blob> {
    return this.http.get(`${this.endpoint}/comprobantes/${claveAcceso}/xml`, {
      responseType: 'blob',
    });
  }

  emitirManual(claveAcceso: string): Observable<unknown> {
    return this.http.post(`${this.endpoint}/comprobantes/${claveAcceso}/emitir-manual`, {});
  }

  reintentar(claveAcceso: string): Observable<unknown> {
    return this.http.post(`${this.endpoint}/comprobantes/${claveAcceso}/reintentar`, {});
  }

  anular(claveAcceso: string): Observable<unknown> {
    return this.http.patch(`${this.endpoint}/comprobantes/${claveAcceso}/anular`, {});
  }

  verificarEnSri(claveAcceso: string): Observable<unknown> {
    return this.http.get(`${this.endpoint}/verificar/${claveAcceso}`);
  }

  sincronizar(body: { rucEmisor?: string } = {}): Observable<unknown> {
    return this.http.post(`${this.endpoint}/sincronizar`, body);
  }
}
