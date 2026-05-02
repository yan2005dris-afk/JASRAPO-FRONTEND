import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SpinnerService } from '../../core/services/spinner.service';
import { ConsultaPlanillaService } from './consulta-planilla.service';

@Component({
  selector: 'app-consulta-planilla',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './consulta-planilla.component.html',
  styleUrls: ['./consulta-planilla.component.css']
})
export class ConsultaPlanillaComponent {
  terminoBusqueda = '';
  searchType = 'medidor';
  
  loading = false;
  searchClicked = false;
  noResults = false;
  results: unknown = null;

  searchOptions = [
    { value: 'medidor', label: 'Número de medidor' },
    { value: 'guia', label: 'Guía de remisión' }
  ];

  private readonly spinnerService = inject(SpinnerService);
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
    this.spinnerService.loadingOn();
    this.noResults = false;
    this.results = null;

    this.consultaPlanillaService.consultar(this.terminoBusqueda, this.searchType).subscribe({
      next: (data) => {
        this.loading = false;
        this.spinnerService.loadingOff();
        if (data) {
          this.results = data;
        } else {
          this.noResults = true;
        }
      },
      error: (error) => {
        this.loading = false;
        this.spinnerService.loadingOff();
        this.noResults = true;
        console.error('Error during consultation:', error);
      }
    });
  }

  onEnter(): void {
    this.consultar();
  }
}
