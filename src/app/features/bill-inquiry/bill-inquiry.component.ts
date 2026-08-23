import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ConsultaPlanillaService,
  ContratoDeudaPublica,
  DeudaPublicaResponse,
  SearchType,
} from './bill-inquiry.service';
import { PlanillaPdfService } from '../consulta-planilla/genera-planilla/planilla-pdf.service';

@Component({
  selector: 'app-bill-inquiry',
  imports: [CommonModule, FormsModule, RouterLink, NgOptimizedImage],
  templateUrl: './bill-inquiry.component.html',
  styleUrl: './bill-inquiry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillInquiryComponent {
  readonly terminoBusqueda = signal('');
  readonly searchType = signal<SearchType>('identificacion');

  readonly loading = signal(false);
  readonly searchClicked = signal(false);
  readonly noResults = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly results = signal<DeudaPublicaResponse | null>(null);

  readonly searchOptions = [
    { value: 'identificacion', label: 'Cédula / RUC / Pasaporte' },
    { value: 'numeroGuia', label: 'Número de Guía / Contrato' },
  ];

  private readonly consultaPlanillaService = inject(ConsultaPlanillaService);
  private readonly planillaPdfService = inject(PlanillaPdfService);
  private readonly router = inject(Router);

  readonly inputLabel = computed(() => {
    return this.searchType() === 'identificacion'
      ? 'Cédula / RUC / Pasaporte'
      : 'Número de Guía / Contrato';
  });

  readonly inputPlaceholder = computed(() => {
    return this.searchType() === 'identificacion' ? 'Ej: 2450524562' : 'Ej: GUIA-OLON-001';
  });

  setSearchType(type: SearchType): void {
    this.searchType.set(type);
    this.terminoBusqueda.set('');
    this.results.set(null);
    this.noResults.set(false);
    this.errorMessage.set(null);
  }

  limpiar(): void {
    this.terminoBusqueda.set('');
    this.results.set(null);
    this.noResults.set(false);
    this.errorMessage.set(null);
  }

  async consultar(): Promise<void> {
    this.searchClicked.set(true);
    const term = this.terminoBusqueda().trim();
    if (term.length < 2) {
      this.noResults.set(false);
      this.results.set(null);
      return;
    }

    this.loading.set(true);
    this.noResults.set(false);
    this.errorMessage.set(null);
    this.results.set(null);

    try {
      const data = await this.consultaPlanillaService.consultar(term, this.searchType());
      this.loading.set(false);
      if (data) {
        this.results.set(data);
        this.consultaPlanillaService.currentDeuda.set(data);
      } else {
        this.noResults.set(true);
      }
    } catch (error: unknown) {
      this.loading.set(false);
      const httpError = error as { status?: number };
      if (httpError?.status === 404) {
        this.noResults.set(true);
      } else if (httpError?.status === 429) {
        this.errorMessage.set(
          'Demasiadas consultas. Por favor, intente nuevamente en unos minutos.',
        );
      } else {
        this.errorMessage.set('Ocurrió un error al consultar la deuda. Intente más tarde.');
      }
      console.error('Error during debt consultation:', error);
    }
  }

  descargarPlanillaContrato(contrato: ContratoDeudaPublica): void {
    const cliente = this.results()?.cliente;
    const planillaPayload = this.buildPlanillaData(contrato, cliente);
    this.planillaPdfService.downloadPlanilla(
      planillaPayload,
      `prefactura_${contrato.numeroGuia}.pdf`,
    );
  }

  verVistaPrevia(contrato: ContratoDeudaPublica): void {
    const cliente = this.results()?.cliente;
    const planillaPayload = this.buildPlanillaData(contrato, cliente);
    this.consultaPlanillaService.currentPlanilla.set(planillaPayload);
    this.router.navigate(['/consulta-planilla/preview']);
  }

  private buildPlanillaData(
    contrato: ContratoDeudaPublica,
    cliente?: { nombre: string; identificacion: string | null },
  ) {
    const fechaActual = new Date();
    const fechaEmisionFormatted = fechaActual.toLocaleDateString('es-EC');

    return {
      numeroPlanilla: `PRE-${contrato.numeroGuia}`,
      clienteNombre: cliente?.nombre || 'CONSUMIDOR FINAL',
      clienteIdentificacion: cliente?.identificacion || '9999999999999',
      cuenta: contrato.contratoId,
      medidor: contrato.numeroGuia,
      mesesAtrasados: String(contrato.mesesAtrasado || 0),
      fechaEmision: fechaEmisionFormatted,
      fechaVencimiento: fechaEmisionFormatted,
      categoria: 'RESIDENCIAL',
      facturacion: 'MENSUAL',
      totalPagar: contrato.saldoVencido,
      subtotal12: 0,
      subtotal0: contrato.saldoVencido,
      subtotalNoObjeto: 0,
      subtotalExento: 0,
      subtotalSinImpuestos: contrato.saldoVencido,
      totalDescuento: 0,
      iva12: 0,
      detalles: [
        {
          codigo: 'AGUA',
          cant: '1.0',
          desc: `Servicio de Agua Potable y Alcantarillado (${contrato.numeroGuia})`,
          uni: contrato.saldoVencido.toFixed(2),
          sub: '0.00',
          pre: contrato.saldoVencido.toFixed(2),
          des: '0.00',
          tot: contrato.saldoVencido.toFixed(2),
        },
      ],
    };
  }

  onEnter(): void {
    void this.consultar();
  }
}
