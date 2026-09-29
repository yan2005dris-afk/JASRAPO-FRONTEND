import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorService } from '../service/operator.service';
import { MeterCacheService } from '../../../core/services/meter-cache.service';
import { MeterCardComponent } from '../components/meter-card/meter-card.component';
import type { ReadingWithAnomaly } from '../models/operator.models';
import type { IMeterDto } from '../../contracts/meters/domain/models/meter.model';

interface AnomalyWithMeter extends ReadingWithAnomaly {
  meterDto: IMeterDto | null;
}

@Component({
  selector: 'app-operator-novelties',
  standalone: true,
  imports: [CommonModule, MeterCardComponent],
  templateUrl: './novedades.component.html',
  styleUrl: './novedades.component.scss',
})
export class NovedadesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly networkService = inject(NetworkService);
  private readonly operatorService = inject(OperatorService);
  private readonly meterCache = inject(MeterCacheService);

  readonly anomalies = signal<AnomalyWithMeter[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isOffline = signal<boolean>(false);

  ngOnInit(): void {
    if (this.networkService.isOnline()) {
      this.loadAnomalies();
    } else {
      this.isOffline.set(true);
    }
  }

  private async loadAnomalies(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.meterCache.load();
      const meters = this.meterCache.metersList();
      const idMap = new Map<string, IMeterDto>();
      for (const m of meters) idMap.set(m.medidorId.toString(), m);

      const data = await firstValueFrom(this.operatorService.getReadingsWithAnomalies());
      this.anomalies.set(
        data.map((a) => ({
          ...a,
          anomalias: a.anomalias ?? [],
          meterDto: a.medidorId ? (idMap.get(a.medidorId) ?? null) : null,
        })),
      );
    } catch {
      // leave empty
    } finally {
      this.isLoading.set(false);
    }
  }

  newNovedad(): void {
    this.router.navigate(['/app/operador/novedades/new']);
  }

  editNovedad(item: AnomalyWithMeter): void {
    const first = item.anomalias[0];
    this.router.navigate(['/app/operador/novedades/new'], {
      queryParams: {
        lecturaId: item.lecturaId,
        medidorId: item.meterDto?.medidorId ?? null,
        tipo: first?.tipo ?? null,
        observacion: first?.observacion ?? null,
      },
    });
  }

  retry(): void {
    this.isOffline.set(false);
    this.loadAnomalies();
  }
}
