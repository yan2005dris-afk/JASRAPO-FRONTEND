import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlanillaPdfService } from '../genera-planilla/planilla-pdf.service';
import { ConsultaPlanillaService, PlanillaPdfData } from '../../bill-inquiry/bill-inquiry.service';
import { PdfPreviewerComponent } from '../../../shared/components/pdf-previewer/pdf-previewer.component';

@Component({
  selector: 'app-preview-planilla',
  standalone: true,
  imports: [CommonModule, PdfPreviewerComponent],
  template: `
    <div class="container-fluid py-4">
      <div class="card shadow-sm border-0 preview-card">
        <div
          class="card-header preview-header text-white d-flex justify-content-between align-items-center"
        >
          <div class="d-flex align-items-center gap-3">
            <button
              class="btn btn-light btn-sm d-inline-flex align-items-center gap-1"
              (click)="volver()"
            >
              <i class="bi bi-arrow-left"></i>
              <span>Volver a Consulta</span>
            </button>
            <h5 class="mb-0 fs-6 fw-bold">Previsualización de Planilla</h5>
          </div>
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
          @if (pdfBase64) {
            <div class="p-2 bg-light border-bottom text-muted small">
              <i class="bi bi-file-earmark-pdf me-1 text-primary"></i>
              <span>Documento renderizado listo para descarga o impresión</span>
            </div>
          }
          <app-pdf-previewer [src]="pdfBase64" height="80vh"></app-pdf-previewer>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .preview-card {
        border-radius: 12px;
        overflow: hidden;
      }
      .preview-header {
        background-color: #0c9ea1;
        padding: 0.85rem 1.25rem;
      }
    `,
  ],
})
export class PreviewPlanillaComponent implements OnInit, AfterViewInit {
  private planillaPdfService = inject(PlanillaPdfService);
  private consultaPlanillaService = inject(ConsultaPlanillaService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  pdfBase64?: string;
  planillaData?: PlanillaPdfData;

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
    if (!this.planillaData) return;
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

  volver(): void {
    this.router.navigate(['/consulta-planilla']);
  }

  regenerar() {
    this.pdfBase64 = undefined;
    setTimeout(() => void this.generarPlanilla(), 100);
  }

  descargar() {
    if (!this.planillaData) return;
    this.planillaPdfService.downloadPlanilla(
      this.planillaData,
      `planilla_${this.planillaData.numeroPlanilla}.pdf`,
    );
  }
}
