import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MetersApi } from '../../data/meters.api';
import { IMeter, IMeterHistory, IReplaceMeterResponse } from '../../domain/models/meter.model';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LocalDatePipe } from '../../../../../shared/pipes/local-date.pipe';

@Component({
  selector: 'app-meter-history-detail',
  imports: [CommonModule, RouterLink, StatusBadgeComponent, EmptyStateComponent, LocalDatePipe],
  templateUrl: './meter-history-detail.component.html',
  styleUrl: './meter-history-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeterHistoryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly metersService = inject(MetersApi);

  readonly meterId = signal<number>(0);
  readonly meter = signal<IMeter | null>(null);
  readonly history = signal<IMeterHistory[]>([]);

  // Mapa de detalles de reemplazos cargados por ID de reemplazo
  readonly replacementDetails = signal<Record<string, IReplaceMeterResponse>>({});
  // Set de IDs de reemplazos expandidos en la tabla
  readonly expandedReplacements = signal<Set<string>>(new Set());
  // Set de IDs de reemplazos cargando
  readonly loadingReplacements = signal<Set<string>>(new Set());

  // Estados generales
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.meterId.set(id);
      this.loadMeterData(id);
    } else {
      this.errorMessage.set('No se especificó un ID de medidor válido.');
      this.isLoading.set(false);
    }
  }

  loadMeterData(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.metersService.getMeterById(id).subscribe({
      next: (m) => this.meter.set(m),
      error: () => {
        // Fallback no bloqueante si getMeterById falla
      },
    });

    this.metersService.getMeterHistory(id).subscribe({
      next: (data) => {
        this.history.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(
          err?.error?.message || 'Ocurrió un error al cargar el historial del medidor.',
        );
        this.isLoading.set(false);
      },
    });
  }

  toggleReplacement(reemplazoId: string | null): void {
    if (!reemplazoId) return;

    const currentExpanded = new Set(this.expandedReplacements());

    if (currentExpanded.has(reemplazoId)) {
      currentExpanded.delete(reemplazoId);
      this.expandedReplacements.set(currentExpanded);
      return;
    }

    currentExpanded.add(reemplazoId);
    this.expandedReplacements.set(currentExpanded);

    // Si aún no hemos cargado los datos de este reemplazo, los solicitamos
    if (!this.replacementDetails()[reemplazoId]) {
      const currentLoading = new Set(this.loadingReplacements());
      currentLoading.add(reemplazoId);
      this.loadingReplacements.set(currentLoading);

      this.metersService.getReplacementDetail(reemplazoId).subscribe({
        next: (detail) => {
          this.replacementDetails.update((prev) => ({
            ...prev,
            [reemplazoId]: detail,
          }));
          this.loadingReplacements.update((prev) => {
            const next = new Set(prev);
            next.delete(reemplazoId);
            return next;
          });
        },
        error: () => {
          this.loadingReplacements.update((prev) => {
            const next = new Set(prev);
            next.delete(reemplazoId);
            return next;
          });
        },
      });
    }
  }

  isExpanded(reemplazoId: string | null): boolean {
    if (!reemplazoId) return false;
    return this.expandedReplacements().has(reemplazoId);
  }

  isLoadingReplacement(reemplazoId: string | null): boolean {
    if (!reemplazoId) return false;
    return this.loadingReplacements().has(reemplazoId);
  }

  getMotivoLabel(motivo: string | null | undefined): string {
    if (!motivo) return '—';
    switch (motivo) {
      case 'DANO':
        return 'Daño / Avería';
      case 'MANTENIMIENTO_PREVENTIVO':
        return 'Mantenimiento Preventivo';
      case 'CALIBRACION':
        return 'Calibración Periódica';
      case 'REUBICACION':
        return 'Reubicación';
      case 'FIN_VIDA_UTIL':
        return 'Fin de Vida Útil';
      default:
        return String(motivo).replace(/_/g, ' ');
    }
  }

  getResponsabilidadLabel(resp: string | null | undefined): string {
    if (!resp) return '—';
    switch (resp) {
      case 'USUARIO':
        return 'Usuario';
      case 'JUNTA':
        return 'Junta Administradora';
      case 'TERCERO':
        return 'Terceros';
      case 'NO_DETERMINADA':
        return 'No Determinada';
      case 'NO_APLICA':
        return 'No Aplica';
      default:
        return String(resp).replace(/_/g, ' ');
    }
  }

  getTratamientoLabel(t: string | null | undefined): string {
    if (!t) return '—';
    switch (t) {
      case 'COBRO_REAL':
        return 'Cobro Real';
      case 'PROMEDIO_HISTORICO':
        return 'Promedio Histórico';
      case 'EXONERADO':
        return 'Exonerado';
      case 'COBRO_PARCIAL':
        return 'Cobro Parcial';
      case 'FACTURAR_PERIODO_ACTUAL':
        return 'Facturar en Período Actual';
      case 'DIFERIR_SIGUIENTE_PERIODO':
        return 'Diferir al Siguiente Período';
      default:
        return String(t).replace(/_/g, ' ');
    }
  }
}
