import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConsultaPlanillaService, PlanillaMockResponse } from './consulta-planilla.service';

@Component({
  selector: 'app-consulta-planilla',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgOptimizedImage],
  templateUrl: './consulta-planilla.component.html',
  styleUrl: './consulta-planilla.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConsultaPlanillaComponent {
  terminoBusqueda = '';
  searchType = 'medidor';
  
  loading = false;
  searchClicked = false;
  noResults = false;
  results: PlanillaMockResponse | null = null;

  searchOptions = [
    { value: 'medidor', label: 'Número de medidor' },
    { value: 'guia', label: 'Guía de remisión' }
  ];

  private readonly consultaPlanillaService = inject(ConsultaPlanillaService);

  get inputLabel(): string {
    return this.searchType === 'medidor' ? 'Número de medidor' : 'Guía de remisión';
  }

  consultar(): void {
    this.searchClicked = true;
    if (this.terminoBusqueda.trim() === '') {
      this.noResults = false;
      this.results = null;
      return;
    }

    this.loading = true;
    this.noResults = false;
    this.results = null;

    this.consultaPlanillaService.consultar(this.terminoBusqueda, this.searchType).subscribe({
      next: (data) => {
        this.loading = false;
        if (data) {
          this.results = data;
        } else {
          this.noResults = true;
        }
      },
      error: (error) => {
        this.loading = false;
        this.noResults = true;
        console.error('Error during consultation:', error);
      }
    });
  }

  onEnter(): void {
    this.consultar();
  }
}
