import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  IAccountStatementFilters,
  IClientsListFilters,
  IConnectionHistoryFilters,
  IOverdueAccountsFilters,
  IPaymentAgreementFilters,
  IPaymentsReportFilters,
  IReportResponse,
  ISendClientsListEmailBody,
  ISendReportEmailBody,
  IZoneConsumptionFilters,
} from '../interfaces/ireport.interface';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/reports`;

  /** Construye query params omitiendo valores vacíos. */
  private buildParams<T extends object>(filters: T): HttpParams {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }

  // ---------- Reporte de Abonos ----------

  /** Obtiene el reporte de abonos en formato JSON. */
  getPaymentsReport(filters: IPaymentsReportFilters = {}): Observable<IReportResponse> {
    const params = this.buildParams(filters);
    return this.http.get<IReportResponse>(`${this.endpoint}/payments-report`, { params });
  }

  /** Obtiene el reporte de abonos en PDF (negociación de contenido por header Accept). */
  getPaymentsReportPdf(filters: IPaymentsReportFilters = {}): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.endpoint}/payments-report`, {
      params,
      headers: { Accept: 'application/pdf' },
      responseType: 'blob',
    });
  }

  /** Exporta el reporte de abonos en streaming (CSV o XLSX). */
  exportPaymentsReport(
    filters: IPaymentsReportFilters = {},
    format: 'csv' | 'xlsx',
  ): Observable<Blob> {
    const params = this.buildParams({ ...filters, format });
    return this.http.get(`${this.endpoint}/payments-report`, {
      params,
      responseType: 'blob',
    });
  }

  /** Envía por email el reporte de abonos (clienteId obligatorio). */
  sendPaymentsReportEmail(body: ISendReportEmailBody): Observable<unknown> {
    return this.http.post(`${this.endpoint}/payments-report/email`, body);
  }

  // ---------- Historial de Conexión ----------

  /** Obtiene el historial de conexión en formato JSON. */
  getConnectionHistory(filters: IConnectionHistoryFilters): Observable<IReportResponse> {
    const params = this.buildParams(filters);
    return this.http.get<IReportResponse>(`${this.endpoint}/connection-history`, { params });
  }

  /** Obtiene el historial de conexión en PDF. */
  getConnectionHistoryPdf(filters: IConnectionHistoryFilters): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.endpoint}/connection-history`, {
      params,
      headers: { Accept: 'application/pdf' },
      responseType: 'blob',
    });
  }

  /** Exporta el historial de conexión en streaming (CSV o XLSX). */
  exportConnectionHistory(
    filters: IConnectionHistoryFilters,
    format: 'csv' | 'xlsx',
  ): Observable<Blob> {
    const params = this.buildParams({ ...filters, format });
    return this.http.get(`${this.endpoint}/connection-history`, {
      params,
      responseType: 'blob',
    });
  }

  /** Envía por email el historial de conexión (contratoId obligatorio). */
  sendConnectionHistoryEmail(body: ISendReportEmailBody): Observable<unknown> {
    return this.http.post(`${this.endpoint}/connection-history/email`, body);
  }

  // ---------- Convenio de Pago ----------

  /** Obtiene el convenio de pago en formato JSON. */
  getPaymentAgreement(filters: IPaymentAgreementFilters): Observable<IReportResponse> {
    const params = this.buildParams(filters);
    return this.http.get<IReportResponse>(`${this.endpoint}/payment-agreement`, { params });
  }

  /** Obtiene el convenio de pago en PDF. */
  getPaymentAgreementPdf(filters: IPaymentAgreementFilters): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.endpoint}/payment-agreement`, {
      params,
      headers: { Accept: 'application/pdf' },
      responseType: 'blob',
    });
  }

  /** Exporta el convenio de pago en streaming (CSV o XLSX). */
  exportPaymentAgreement(
    filters: IPaymentAgreementFilters,
    format: 'csv' | 'xlsx',
  ): Observable<Blob> {
    const params = this.buildParams({ ...filters, format });
    return this.http.get(`${this.endpoint}/payment-agreement`, {
      params,
      responseType: 'blob',
    });
  }

  /** Envía por email el convenio de pago (convenioId obligatorio). */
  sendPaymentAgreementEmail(body: ISendReportEmailBody): Observable<unknown> {
    return this.http.post(`${this.endpoint}/payment-agreement/email`, body);
  }

  // ---------- Listado de Clientes ----------

  /** Obtiene el listado de clientes en formato JSON. */
  getClientsList(filters: IClientsListFilters = {}): Observable<IReportResponse> {
    const params = this.buildParams(filters);
    return this.http.get<IReportResponse>(`${this.endpoint}/clients-list`, { params });
  }

  /** Obtiene el listado de clientes en PDF. */
  getClientsListPdf(filters: IClientsListFilters = {}): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.endpoint}/clients-list`, {
      params,
      headers: { Accept: 'application/pdf' },
      responseType: 'blob',
    });
  }

  /** Exporta el listado de clientes en streaming (CSV o XLSX). */
  exportClientsList(filters: IClientsListFilters = {}, format: 'csv' | 'xlsx'): Observable<Blob> {
    const params = this.buildParams({ ...filters, format });
    return this.http.get(`${this.endpoint}/clients-list`, {
      params,
      responseType: 'blob',
    });
  }

  /** Envía por email el listado de clientes (destinatario obligatorio). */
  sendClientsListEmail(body: ISendClientsListEmailBody): Observable<unknown> {
    return this.http.post(`${this.endpoint}/clients/email`, body);
  }

  // ---------- Estado de Cuenta ----------

  /** Obtiene el estado de cuenta en formato JSON. */
  getAccountStatement(filters: IAccountStatementFilters): Observable<IReportResponse> {
    const params = this.buildParams(filters);
    return this.http.get<IReportResponse>(`${this.endpoint}/account-statement`, { params });
  }

  /** Obtiene el estado de cuenta en PDF. */
  getAccountStatementPdf(filters: IAccountStatementFilters): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.endpoint}/account-statement`, {
      params,
      headers: { Accept: 'application/pdf' },
      responseType: 'blob',
    });
  }

  /** Exporta el estado de cuenta en streaming (CSV o XLSX). */
  exportAccountStatement(
    filters: IAccountStatementFilters,
    format: 'csv' | 'xlsx',
  ): Observable<Blob> {
    const params = this.buildParams({ ...filters, format });
    return this.http.get(`${this.endpoint}/account-statement`, {
      params,
      responseType: 'blob',
    });
  }

  /** Envía por email el estado de cuenta (contratoId obligatorio). */
  sendAccountStatementEmail(body: ISendReportEmailBody): Observable<unknown> {
    return this.http.post(`${this.endpoint}/account-statement/email`, body);
  }

  // ---------- Recaudación y Morosidad ----------

  /** Obtiene el reporte de recaudación y morosidad en formato JSON. */
  getOverdueAccounts(filters: IOverdueAccountsFilters = {}): Observable<IReportResponse> {
    const params = this.buildParams(filters);
    return this.http.get<IReportResponse>(`${this.endpoint}/overdue-accounts`, { params });
  }

  /** Obtiene el reporte de recaudación y morosidad en PDF. */
  getOverdueAccountsPdf(filters: IOverdueAccountsFilters = {}): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.endpoint}/overdue-accounts`, {
      params,
      headers: { Accept: 'application/pdf' },
      responseType: 'blob',
    });
  }

  /** Exporta el reporte de recaudación y morosidad en streaming (CSV o XLSX). */
  exportOverdueAccounts(
    filters: IOverdueAccountsFilters = {},
    format: 'csv' | 'xlsx',
  ): Observable<Blob> {
    const params = this.buildParams({ ...filters, format });
    return this.http.get(`${this.endpoint}/overdue-accounts`, {
      params,
      responseType: 'blob',
    });
  }

  /** Envía por email el reporte de recaudación y morosidad (destinatario obligatorio). */
  sendOverdueAccountsEmail(body: ISendReportEmailBody): Observable<unknown> {
    return this.http.post(`${this.endpoint}/overdue-accounts/email`, body);
  }

  // ---------- Consumo por Zonas (PDF-11) ----------

  /** Obtiene el reporte de consumo por zonas en formato JSON. */
  getZoneConsumption(
    filters: IZoneConsumptionFilters = {},
  ): Observable<IReportResponse> {
    const params = this.buildParams(filters);
    return this.http.get<IReportResponse>(`${this.endpoint}/zone-consumption`, {
      params,
    });
  }

  /** Obtiene el reporte de consumo por zonas en PDF. */
  getZoneConsumptionPdf(
    filters: IZoneConsumptionFilters = {},
  ): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.endpoint}/zone-consumption`, {
      params,
      headers: { Accept: 'application/pdf' },
      responseType: 'blob',
    });
  }

  /** Exporta el reporte de consumo por zonas en streaming (CSV o XLSX). */
  exportZoneConsumption(
    filters: IZoneConsumptionFilters = {},
    format: 'csv' | 'xlsx',
  ): Observable<Blob> {
    const params = this.buildParams({ ...filters, format });
    return this.http.get(`${this.endpoint}/zone-consumption`, {
      params,
      responseType: 'blob',
    });
  }

  /** Envía por email el reporte de consumo por zonas (destinatario obligatorio). */
  sendZoneConsumptionEmail(body: ISendReportEmailBody): Observable<unknown> {
    return this.http.post(`${this.endpoint}/zone-consumption/email`, body);
  }

  // ---------- Utilidad de descarga ----------

  /** Descarga un Blob en el navegador con el nombre de archivo especificado. */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
