import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConsultaPlanillaService, DeudaPublicaResponse, SearchType } from './bill-inquiry.service';

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

  consultar(): void {
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

    this.consultaPlanillaService.consultar(term, this.searchType()).subscribe({
      next: (data) => {
        this.loading.set(false);
        if (data) {
          this.results.set(data);
          this.consultaPlanillaService.currentDeuda.set(data);
        } else {
          this.noResults.set(true);
        }
      },
      error: (error) => {
        this.loading.set(false);
        if (error.status === 404) {
          this.noResults.set(true);
        } else if (error.status === 429) {
          this.errorMessage.set(
            'Demasiadas consultas. Por favor, intente nuevamente en unos minutos.',
          );
        } else {
          this.errorMessage.set('Ocurrió un error al consultar la deuda. Intente más tarde.');
        }
        console.error('Error during debt consultation:', error);
      },
    });
  }

  onEnter(): void {
    this.consultar();
  }
}
