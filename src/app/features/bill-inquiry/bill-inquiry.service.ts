import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type SearchType = 'identificacion' | 'numeroGuia';

export interface ClienteDeudaPublica {
  nombre: string;
  identificacion: string | null;
}

export interface ContratoDeudaPublica {
  contratoId: string;
  numeroGuia: string;
  estado: string;
  saldoVencido: number;
  deudaAnterior: number;
  mesesAtrasado: number;
}

export interface DeudaPublicaResponse {
  cliente: ClienteDeudaPublica;
  contratos: ContratoDeudaPublica[];
  totalDeuda: number;
}

@Injectable({
  providedIn: 'root',
})
export class ConsultaPlanillaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/search`;

  // State para guardar el resultado de búsqueda actual
  public readonly currentDeuda = signal<DeudaPublicaResponse | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly currentPlanilla = signal<any>(null);

  consultar(termino: string, tipo: SearchType): Observable<DeudaPublicaResponse> {
    const params = {
      tipo,
      valor: termino.trim(),
    };

    return this.http.get<DeudaPublicaResponse>(this.apiUrl, { params }).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      }),
    );
  }
}
