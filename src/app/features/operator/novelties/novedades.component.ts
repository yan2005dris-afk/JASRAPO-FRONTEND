import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorService } from '../service/operator.service';
import { MeterCacheService } from '../../../core/services/meter-cache.service';
import { IndexedDbService, type PendingRecord } from '../../../core/services/indexed-db.service';
import { AuthService } from '../../../core/services/auth.service';
import { MeterCardComponent } from '../components/meter-card/meter-card.component';
import type { AnomaliaItem, ReadingWithAnomaly } from '../models/operator.models';
import type { IMeterDto } from '../../contracts/meters/domain/models/meter.model';

const STALE_CACHE_MS = 24 * 60 * 60 * 1000;

interface AnomalyWithMeter extends ReadingWithAnomaly {
  meterDto: IMeterDto | null;
  isPending: boolean;
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
  private readonly dbService = inject(IndexedDbService);
  private readonly authService = inject(AuthService);

  readonly anomalies = signal<AnomalyWithMeter[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isOffline = signal<boolean>(false);
  readonly cachedAt = signal<string | null>(null);
  readonly isStale = signal<boolean>(false);

  ngOnInit(): void {
    if (this.networkService.isOnline()) {
      void this.loadAnomalies();
    } else {
      this.isOffline.set(true);
      void this.loadFromCache();
    }
  }

  private operatorScope(): string | undefined {
    const operatorId = this.authService.currentUser()?.id;
    return operatorId ? `operator:${operatorId}` : undefined;
  }

  private buildMeterMap(): Map<string, IMeterDto> {
    const idMap = new Map<string, IMeterDto>();
    for (const meter of this.meterCache.metersList()) {
      idMap.set(meter.medidorId.toString(), meter);
    }
    return idMap;
  }

  private toAnomalyItem(
    reading: ReadingWithAnomaly,
    idMap: Map<string, IMeterDto>,
  ): AnomalyWithMeter {
    return {
      ...reading,
      anomalias: reading.anomalias ?? [],
      meterDto: reading.medidorId ? (idMap.get(reading.medidorId) ?? null) : null,
      isPending: false,
    };
  }

  private toPendingItem(pending: PendingRecord, idMap: Map<string, IMeterDto>): AnomalyWithMeter {
    const medidorId = pending['medidorId'] != null ? String(pending['medidorId']) : null;
    const anomalia: AnomaliaItem = {
      tipo: pending['tipo'] != null ? String(pending['tipo']) : 'OTRO',
      observacion: pending['observacion'] != null ? String(pending['observacion']) : '',
      estado: 'PENDIENTE',
    };
    return {
      lecturaId: null,
      medidorId,
      medidorSerie:
        pending['serie'] != null ? String(pending['serie']) : (medidorId ?? 'Sin medidor'),
      fecha: pending['fecha'] != null ? String(pending['fecha']) : new Date().toISOString(),
      estado: 'PENDIENTE',
      anomalias: [anomalia],
      meterDto: medidorId ? (idMap.get(medidorId) ?? null) : null,
      isPending: true,
    };
  }

  private async loadAnomalies(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.meterCache.load();
      const idMap = this.buildMeterMap();
      const data = await firstValueFrom(this.operatorService.getReadingsWithAnomalies());
      const items = data.map((reading) => this.toAnomalyItem(reading, idMap));
      await this.persistNovedadesCache(data);
      this.cachedAt.set(null);
      this.isStale.set(false);
      this.anomalies.set(items);
    } catch {
      // Fallback: si el fetch online falló, renderizar el caché offline si existe.
      await this.loadFromCache();
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadFromCache(): Promise<void> {
    this.isOffline.set(true);
    try {
      await this.meterCache.load();
      const scope = this.operatorScope();
      const cache = scope
        ? await this.dbService.getNovedadesCache<ReadingWithAnomaly>(scope)
        : null;
      if (!cache) {
        this.cachedAt.set(null);
        this.isStale.set(false);
        this.anomalies.set(await this.mergePending([]));
        return;
      }
      const idMap = this.buildMeterMap();
      const items = cache.items.map((reading) => this.toAnomalyItem(reading, idMap));
      this.cachedAt.set(cache.savedAt);
      this.isStale.set(Date.now() - new Date(cache.savedAt).getTime() > STALE_CACHE_MS);
      this.anomalies.set(await this.mergePending(items));
    } catch {
      this.anomalies.set([]);
    }
  }

  private async persistNovedadesCache(readings: ReadingWithAnomaly[]): Promise<void> {
    const scope = this.operatorScope();
    if (!scope) return;
    try {
      await this.dbService.saveNovedadesCache(scope, readings);
    } catch (error) {
      console.warn('No se pudo guardar el caché offline de novedades:', error);
    }
  }

  /** Fusiona anomalías encoladas localmente que aún no están representadas en la lista base. */
  private async mergePending(base: AnomalyWithMeter[]): Promise<AnomalyWithMeter[]> {
    const pendings = await this.dbService.getPendingAnomalies();
    if (pendings.length === 0) return base;

    const representedMeters = new Set(
      base
        .map((item) => (item.medidorId != null ? String(item.medidorId) : ''))
        .filter((id) => id !== ''),
    );
    const idMap = this.buildMeterMap();
    const pendingItems = pendings
      .filter((pending) => {
        const meterId = pending['medidorId'] != null ? String(pending['medidorId']) : '';
        return meterId !== '' && !representedMeters.has(meterId);
      })
      .map((pending) => this.toPendingItem(pending, idMap));

    return [...pendingItems, ...base];
  }

  newNovedad(): void {
    this.router.navigate(['/app/operador/novedades/new']);
  }

  editNovedad(item: AnomalyWithMeter): void {
    if (!item.lecturaId || item.isPending) return;
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
    void this.loadAnomalies();
  }
}
