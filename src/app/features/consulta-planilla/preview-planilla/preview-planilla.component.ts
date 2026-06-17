import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlanillaPdfService } from '../genera-planilla/planilla-pdf.service';
import { ConsultaPlanillaService } from '../../bill-inquiry/bill-inquiry.service';
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
          <div>
            <button class="btn btn-light btn-sm me-2" (click)="descargar()">
              <i class="bi bi-download"></i> Descargar PDF
            </button>
            <button class="btn btn-light btn-sm" (click)="regenerar()">
              <i class="bi bi-arrow-clockwise"></i> Actualizar
            </button>
          </div>
        </div>
        <div class="card-body p-0">
          <div *ngIf="pdfBase64" class="p-2 bg-light">
            <small>Longitud del DataURL generado: {{ pdfBase64.length }}</small>
          </div>
          <app-pdf-previewer [src]="pdfBase64" height="80vh"></app-pdf-previewer>
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
export class PreviewPlanillaComponent implements OnInit, AfterViewInit {
  private planillaPdfService = inject(PlanillaPdfService);
  private consultaPlanillaService = inject(ConsultaPlanillaService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
  pdfBase64?: string;
  
  planillaData: any;

  ngOnInit(): void {
    const data = this.consultaPlanillaService.currentPlanilla();
    if (!data) {
      this.router.navigate(['/consulta-planilla']);
      return;
    }
    this.planillaData = data;
  }

  ngAfterViewInit(): void {
    if (this.planillaData) {
      setTimeout(() => {
        this.generarPlanilla();
      }, 300);
    }
  }

  async generarPlanilla() {
    try {
      console.log('Iniciando generación de PDF (Blob Promise)...');
      const blob = await this.planillaPdfService.generatePlanillaBlob(this.planillaData);
      console.log('PDF generado exitosamente (Blob size: ' + blob.size + ')');
      this.pdfBase64 = URL.createObjectURL(blob);
      this.cdr.detectChanges(); // Forzar actualización de la vista
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Hubo un error al generar el PDF: ' + (e as Error).message);
    }
  }

  regenerar() {
    this.pdfBase64 = undefined;
    setTimeout(() => this.generarPlanilla(), 100);
  }

  descargar() {
    this.planillaPdfService.downloadPlanilla(this.planillaData, `planilla_${this.planillaData.numeroPlanilla}.pdf`);
  }
}
