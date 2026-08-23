import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MetersService } from '../../services/meters.service';
import { IMeter, IMeterHistory, IReplaceMeterResponse } from '../../interfaces/imeter.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { LocalDatePipe } from '../../../../../shared/pipes/local-date.pipe';

type ActiveTab = 'timeline' | 'reemplazo';

@Component({
  selector: 'app-meter-history-detail',
  imports: [CommonModule, RouterLink, StatusBadgeComponent, EmptyStateComponent, LocalDatePipe],
  templateUrl: './meter-history-detail.component.html',
  styleUrl: './meter-history-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeterHistoryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly metersService = inject(MetersService);

  readonly meterId = signal<number>(0);
  readonly meter = signal<IMeter | null>(null);
  readonly history = signal<IMeterHistory[]>([]);
  readonly activeTab = signal<ActiveTab>('timeline');

  // Detalle de reemplazo
  readonly selectedReplacementId = signal<string | null>(null);
  readonly replacementDetail = signal<IReplaceMeterResponse | null>(null);

  // Estados de carga y error
  readonly isLoading = signal<boolean>(true);
  readonly isLoadingReplacement = signal<boolean>(false);
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

        // Si hay algún reemplazo, pre-cargar el primero para conveniencia del usuario
        const firstReplacement = data.find(
          (item) => item.reemplazoSalienteId || item.reemplazoEntranteId,
        );
        if (firstReplacement) {
          const rId = firstReplacement.reemplazoSalienteId ?? firstReplacement.reemplazoEntranteId;
          if (rId) {
            this.loadReplacementDetail(rId);
          }
        }
      },
      error: (err) => {
        this.errorMessage.set(
          err?.error?.message || 'Ocurrió un error al cargar el historial del medidor.',
        );
        this.isLoading.set(false);
      },
    });
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  viewReplacement(reemplazoId: string | null): void {
    if (!reemplazoId) return;
    this.selectedReplacementId.set(reemplazoId);
    this.activeTab.set('reemplazo');
    this.loadReplacementDetail(reemplazoId);
  }

  loadReplacementDetail(reemplazoId: string): void {
    this.selectedReplacementId.set(reemplazoId);
    this.isLoadingReplacement.set(true);

    this.metersService.getReplacementDetail(reemplazoId).subscribe({
      next: (data) => {
        this.replacementDetail.set(data);
        this.isLoadingReplacement.set(false);
      },
      error: () => {
        this.replacementDetail.set(null);
        this.isLoadingReplacement.set(false);
      },
    });
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
