import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface PlanillaDetalle {
  codigo: string;
  cant: string;
  desc: string;
  uni: string;
  sub: string;
  pre: string;
  des: string;
  tot: string;
}

export interface PlanillaMockResponse {
  guiaRemision?: string;
  numeroPlanilla: string;
  clienteNombre: string;
  clienteIdentificacion: string;
  direccion: string;
  cuenta: string;
  telefono: string;
  fechaEmision: string;
  fechaAutorizacion: string;
  medidor: string;
  mes: string;
  anio: string;
  fechaVencimiento: string;
  lecturaAnterior: string;
  lecturaActual: string;
  consumo: string;
  categoria: string;
  facturacion: string;
  mesesAtrasados: string;

  subtotal0: string;
  subtotal12: string;
  iva12: string;
  total: string;

  resumenConsumo: string;
  resumenAtrasados: string;
  resumenDescuentos: string;

  detalles: PlanillaDetalle[];
}

const MOCK_DB: PlanillaMockResponse[] = [
  {
    guiaRemision: '001-001',
    numeroPlanilla: '2026-000456',
    clienteNombre: 'JUAN PEREZ SÁNCHEZ',
    clienteIdentificacion: '1723456789',
    direccion: 'Calle Los Alamos y Av. Principal',
    cuenta: '1007941',
    telefono: '0987654321',
    fechaEmision: '12/05/2026',
    fechaAutorizacion: '12/05/2026 10:15:00',
    medidor: 'M-554433',
    mes: 'Mayo',
    anio: '2026',
    fechaVencimiento: '25/05/2026',
    lecturaAnterior: '1500',
    lecturaActual: '1520',
    consumo: '20',
    categoria: 'Residencial',
    facturacion: 'Mensual',
    mesesAtrasados: '0',
    subtotal0: '17.50',
    subtotal12: '0.00',
    iva12: '0.00',
    total: '17.50',
    resumenConsumo: '17.50',
    resumenAtrasados: '0.00',
    resumenDescuentos: '0.00',
    detalles: [
      {
        codigo: 'AGU',
        cant: '1.0',
        desc: 'Consumo de Agua Potable',
        uni: '15.00',
        sub: '0.0',
        pre: '15.00',
        des: '0.00',
        tot: '15.00',
      },
      {
        codigo: 'MAN',
        cant: '1.0',
        desc: 'Mantenimiento Redes',
        uni: '2.50',
        sub: '0.0',
        pre: '2.50',
        des: '0.00',
        tot: '2.50',
      },
    ],
  },
  {
    guiaRemision: '001-002',
    numeroPlanilla: '2026-000457',
    clienteNombre: 'MARÍA GÓMEZ LÓPEZ',
    clienteIdentificacion: '0912271290',
    direccion: 'Barrio Central, Mz 10',
    cuenta: '2001552',
    telefono: '0991234567',
    fechaEmision: '13/05/2026',
    fechaAutorizacion: '13/05/2026 14:48:12',
    medidor: 'M-112233',
    mes: 'Mayo',
    anio: '2026',
    fechaVencimiento: '28/05/2026',
    lecturaAnterior: '3100',
    lecturaActual: '3115',
    consumo: '15',
    categoria: 'Comercial',
    facturacion: 'Mensual',
    mesesAtrasados: '1',
    subtotal0: '25.00',
    subtotal12: '0.00',
    iva12: '0.00',
    total: '37.00',
    resumenConsumo: '25.00',
    resumenAtrasados: '12.00',
    resumenDescuentos: '0.00',
    detalles: [
      {
        codigo: 'AGU',
        cant: '1.0',
        desc: 'Consumo Comercial',
        uni: '20.00',
        sub: '0.0',
        pre: '20.00',
        des: '0.00',
        tot: '20.00',
      },
      {
        codigo: 'ALC',
        cant: '1.0',
        desc: 'Alcantarillado',
        uni: '5.00',
        sub: '0.0',
        pre: '5.00',
        des: '0.00',
        tot: '5.00',
      },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class ConsultaPlanillaService {
  // State para guardar la planilla seleccionada y usarla en la previsualización
  public currentPlanilla = signal<PlanillaMockResponse | null>(null);

  consultar(termino: string, tipo: string): Observable<PlanillaMockResponse | null> {
    const termUpper = termino.trim().toUpperCase();

    const found = MOCK_DB.find((p) => {
      if (tipo === 'medidor') {
        return p.medidor.toUpperCase() === termUpper;
      } else {
        return p.guiaRemision === termUpper;
      }
    });

    return of(found || null).pipe(delay(1500));
  }
}
