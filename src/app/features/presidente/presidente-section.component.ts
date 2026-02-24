import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-presidente-section',
    imports: [CommonModule],
    template: `
        <div class="container-fluid p-4">
            <div class="row">
                <div class="col-12">
                    <h2 class="mb-4">Panel de Presidencia</h2>
                    <div class="alert alert-primary">
                        <i class="bi bi-person-badge-fill me-2"></i>
                        Panel exclusivo para el Presidente y Administradores.
                    </div>
                    
                    <div class="row g-4 mt-3">
                        <div class="col-md-4">
                            <div class="card border-primary">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-check-circle me-2"></i>Aprobaciones</h5>
                                    <p class="card-text">Aprueba solicitudes y documentos</p>
                                    <span class="badge bg-danger">5 pendientes</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card border-primary">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-graph-up me-2"></i>Reportes Ejecutivos</h5>
                                    <p class="card-text">Informes y estadísticas</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card border-primary">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-file-earmark-text me-2"></i>Actas de Reunión</h5>
                                    <p class="card-text">Gestión de actas</p>
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
export class PresidenteSectionComponent {}
