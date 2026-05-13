import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanillaPdfService } from '../genera-planilla/planilla-pdf.service';
import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';

@Component({
  selector: 'app-preview-planilla',
  standalone: true,
  imports: [CommonModule, PdfPreviewerComponent],
  template: `
    <div class="container-fluid py-4">
      <div class="card shadow-sm">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Previsualización de Planilla</h5>
          <button class="btn btn-light btn-sm" (click)="regenerar()">
            <i class="bi bi-arrow-clockwise"></i> Actualizar
          </button>
        </div>
        <div class="card-body p-0">
          <app-pdf-previewer [src]="pdfBlob" height="80vh"></app-pdf-previewer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class PreviewPlanillaComponent implements OnInit {
  private planillaPdfService = inject(PlanillaPdfService);
  
  pdfBlob?: Blob;

  ngOnInit(): void {
    this.generarPlanilla();
  }

  async generarPlanilla() {
    // Aquí se pasarían los datos reales de la planilla
    const mockData = {
      numeroPlanilla: '2026-000456',
      clienteNombre: 'Juan Pérez',
      clienteIdentificacion: '1723456789',
      direccion: 'Calle Los Alamos y Av. Principal',
      medidor: 'M-554433',
      mes: 'Mayo',
      anio: '2026',
      fechaEmision: '12/05/2026',
      fechaVencimiento: '25/05/2026',
      lecturaAnterior: '1500',
      lecturaActual: '1520',
      consumo: '20',
      subtotal: '15.00',
      mantenimiento: '2.50',
      total: '17.50'
    };

    this.pdfBlob = await this.planillaPdfService.generatePlanillaBlob(mockData);
  }

  regenerar() {
    this.pdfBlob = undefined;
    setTimeout(() => this.generarPlanilla(), 100);
  }
}
