import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, throwError } from 'rxjs';
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

export interface PlanillaDetalleItem {
  codigo: string;
  cant: string;
  desc: string;
  uni: string;
  sub: string;
  pre: string;
  des: string;
  tot: string;
}

export interface PlanillaPdfData {
  numeroPlanilla: string;
  clienteNombre: string;
  clienteIdentificacion: string;
  cuenta: string;
  medidor: string;
  mesesAtrasados: string;
  fechaEmision: string;
  fechaVencimiento: string;
  categoria: string;
  facturacion: string;
  totalPagar: number;
  subtotal12: number;
  subtotal0: number;
  subtotalNoObjeto: number;
  subtotalExento: number;
  subtotalSinImpuestos: number;
  totalDescuento: number;
  iva12: number;
  direccion?: string;
  telefono?: string;
  email?: string;
  direccionAdicional?: string;
  periodo?: string;
  claveAcceso?: string;
  fechaAutorizacion?: string;
  lecturaAnterior?: string;
  lecturaActual?: string;
  consumo?: string;
  total?: string;
  resumenConsumo?: string;
  resumenAtrasados?: string;
  resumenDescuentos?: string;
  correoCliente?: string;
  detalles: PlanillaDetalleItem[];
}

@Injectable({
  providedIn: 'root',
})
export class ConsultaPlanillaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/search`;

  // State para guardar el resultado de búsqueda actual usando Signals
  public readonly currentDeuda = signal<DeudaPublicaResponse | null>(null);
  public readonly currentPlanilla = signal<PlanillaPdfData | null>(null);

  async consultar(termino: string, tipo: SearchType): Promise<DeudaPublicaResponse> {
    const params = {
      tipo,
      valor: termino.trim(),
    };

    return await firstValueFrom(
      this.http.get<DeudaPublicaResponse>(this.apiUrl, { params }).pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        }),
      ),
    );
  }
}
