import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConsultaPlanillaService, PlanillaMockResponse } from './bill-inquiry.service';

@Component({
  selector: 'app-bill-inquiry',
  imports: [CommonModule, FormsModule, RouterLink, NgOptimizedImage],
  templateUrl: './bill-inquiry.component.html',
  styleUrl: './bill-inquiry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillInquiryComponent {
  readonly terminoBusqueda = signal('');
  readonly searchType = signal('medidor');

  readonly loading = signal(false);
  readonly searchClicked = signal(false);
  readonly noResults = signal(false);
  readonly results = signal<PlanillaMockResponse | null>(null);

  readonly searchOptions = [
    { value: 'medidor', label: 'Número de medidor' },
    { value: 'guia', label: 'Guía de remisión' },
  ];

  private readonly consultaPlanillaService = inject(ConsultaPlanillaService);

  readonly inputLabel = computed(() => {
    return this.searchType() === 'medidor' ? 'Número de medidor' : 'Guía de remisión';
  });

  consultar(): void {
    this.searchClicked.set(true);
    const term = this.terminoBusqueda().trim();
    if (term === '') {
      this.noResults.set(false);
      this.results.set(null);
      return;
    }

    this.loading.set(true);
    this.noResults.set(false);
    this.results.set(null);

    this.consultaPlanillaService.consultar(term, this.searchType()).subscribe({
      next: (data) => {
        this.loading.set(false);
        if (data) {
          this.results.set(data);
        } else {
          this.noResults.set(true);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.noResults.set(true);
        console.error('Error during consultation:', error);
      },
    });
  }

  onEnter(): void {
    this.consultar();
  }
}
