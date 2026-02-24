import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-secretario-section',
    imports: [CommonModule],
    template: `
        <div class="container-fluid p-4">
            <div class="row">
                <div class="col-12">
                    <h2 class="mb-4">Panel de Secretaría</h2>
                    <div class="alert alert-warning">
                        <i class="bi bi-file-earmark-text-fill me-2"></i>
                        Panel para gestión documental - Secretario y Administradores.
                    </div>
                    
                    <div class="row g-4 mt-3">
                        <div class="col-md-4">
                            <div class="card border-warning">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-folder-fill me-2"></i>Documentos</h5>
                                    <p class="card-text">Gestión de documentos</p>
                                    <span class="badge bg-success">128 archivos</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card border-warning">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-envelope-fill me-2"></i>Correspondencia</h5>
                                    <p class="card-text">Entrada y salida de documentos</p>
                                    <span class="badge bg-info">12 nuevos</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card border-warning">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-archive-fill me-2"></i>Archivo General</h5>
                                    <p class="card-text">Archivo histórico</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .card {
            transition: transform 0.2s;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecretarioSectionComponent {}
