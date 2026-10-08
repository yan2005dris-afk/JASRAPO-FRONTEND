import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NetworkService } from '../../../../core/services/network.service';
import { OperatorService } from '../../rutas/data/operator.service';
import { MeterCacheService } from '../../../../core/services/meter-cache.service';
import { IndexedDbService, type PendingRecord } from '../../../../core/services/indexed-db.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MeterCardComponent } from '../../readings/components/meter-card/meter-card.component';
import type { OperatorNovelty } from '../../rutas/domain/operator.models';
import type { IMeterDto } from '../../../contracts/meters/domain/models/meter.model';

const STALE_CACHE_MS = 24 * 60 * 60 * 1000;

interface AnomalyWithMeter extends OperatorNovelty {
  meterDto: IMeterDto | null;
  isPending: boolean;
  localId?: number;
}

interface NoveltyZoneGroup {
  /** comunidadId as string, or 'NONE' for unknowns */
  id: string;
  label: string;
  sectorGroups: {
    id: string;
    label: string | null;
    items: AnomalyWithMeter[];
  }[];
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

  /** Groups anomalies by comunidad → sector, matching the rutas grouping pattern. */
  readonly noveltyZoneGroups = computed<NoveltyZoneGroup[]>(() => {
    const items = this.anomalies();
    if (items.length === 0) return [];

    const comMap = new Map<string, NoveltyZoneGroup>();

    for (const item of items) {
      const comId = item.comunidadId != null ? String(item.comunidadId) : 'NONE';
      const comLabel = item.comunidadNombre ?? 'Sin comunidad';

      if (!comMap.has(comId)) {
        comMap.set(comId, { id: comId, label: comLabel, sectorGroups: [] });
      }
      const comGroup = comMap.get(comId)!;

      const secId = item.sectorId != null ? String(item.sectorId) : 'NONE';
      const secLabel = item.sectorNombre ?? null;

      let secGroup = comGroup.sectorGroups.find((s) => s.id === secId);
      if (!secGroup) {
        secGroup = { id: secId, label: secLabel, items: [] };
        comGroup.sectorGroups.push(secGroup);
      }
      secGroup.items.push(item);
    }

    return [...comMap.values()];
  });

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

  private toAnomalyItem(reading: OperatorNovelty, idMap: Map<string, IMeterDto>): AnomalyWithMeter {
    const cachedMeter = reading.medidorId ? idMap.get(String(reading.medidorId)) : null;
    return {
      ...reading,
      meterDto: cachedMeter
        ? {
            ...cachedMeter,
            clienteNombre: reading.clienteNombre || cachedMeter.clienteNombre,
            direccionSuministro: reading.direccionSuministro || cachedMeter.direccionSuministro,
          }
        : null,
      isPending: false,
    };
  }

  private toPendingItem(pending: PendingRecord, idMap: Map<string, IMeterDto>): AnomalyWithMeter {
    const medidorId = pending['medidorId'] != null ? String(pending['medidorId']) : null;
    const meterDto = medidorId ? (idMap.get(medidorId) ?? null) : null;
    return {
      novedadId: '',
      ordenTrabajoId: String(pending['ordenTrabajoId'] ?? ''),
      lecturaId: null,
      medidorId,
      medidorSerie:
        pending['serie'] != null ? String(pending['serie']) : (medidorId ?? 'Sin medidor'),
      contratoId: String(pending['contratoId'] ?? ''),
      numeroGuia: '',
      clienteNombre: meterDto?.clienteNombre ?? '',
      direccionSuministro: meterDto?.direccionSuministro ?? '',
      comunidadId: null,
      comunidadNombre: null,
      sectorId: null,
      sectorNombre: null,
      tipo: String(pending['tipo'] ?? 'OTRO'),
      observacion: String(pending['observacion'] ?? ''),
      estado: String(pending.syncState ?? 'PENDIENTE_SYNC'),
      fotoUrl: null,
      createdAt: String(pending['fecha'] ?? new Date().toISOString()),
      updatedAt: String(pending['fecha'] ?? new Date().toISOString()),
      meterDto,
      isPending: true,
      localId: pending.id,
    };
  }

  private async loadAnomalies(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.meterCache.load();
      const idMap = this.buildMeterMap();
      const data: OperatorNovelty[] = [];
      let page = 1;
      let total = 0;
      do {
        const result = await firstValueFrom(this.operatorService.getNovelties(page, 100));
        data.push(...result.data);
        total = result.total;
        if (result.data.length === 0) break;
        page++;
      } while (data.length < total);
      const items = data.map((novelty) => this.toAnomalyItem(novelty, idMap));
      await this.persistNovedadesCache(data);
      this.isOffline.set(false);
      this.cachedAt.set(null);
      this.isStale.set(false);
      this.anomalies.set(await this.mergePending(items));
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
        ? await this.dbService.getOperatorNoveltiesCache<OperatorNovelty>(scope)
        : null;
      if (!cache) {
        this.cachedAt.set(null);
        this.isStale.set(false);
        this.anomalies.set(await this.mergePending([]));
        return;
      }
      const idMap = this.buildMeterMap();
      const items = cache.items.map((novelty) => this.toAnomalyItem(novelty, idMap));
      this.cachedAt.set(cache.savedAt);
      this.isStale.set(Date.now() - new Date(cache.savedAt).getTime() > STALE_CACHE_MS);
      this.anomalies.set(await this.mergePending(items));
    } catch {
      this.anomalies.set([]);
    }
  }

  private async persistNovedadesCache(novelties: OperatorNovelty[]): Promise<void> {
    const scope = this.operatorScope();
    if (!scope) return;
    try {
      await this.dbService.saveOperatorNoveltiesCache(scope, novelties);
    } catch (error) {
      console.warn('No se pudo guardar el caché offline de novedades:', error);
    }
  }

  /** Las novedades pendientes son registros separados, incluso si comparten medidor. */
  private async mergePending(base: AnomalyWithMeter[]): Promise<AnomalyWithMeter[]> {
    const pendings = await this.dbService.getPendingAnomalies();
    if (pendings.length === 0) return base;
    const idMap = this.buildMeterMap();
    const pendingItems = pendings.map((pending) => this.toPendingItem(pending, idMap));

    return [...pendingItems, ...base];
  }

  newNovedad(): void {
    this.router.navigate(['/app/operador/novedades/new']);
  }

  editNovedad(item: AnomalyWithMeter): void {
    if (!item.novedadId || item.isPending || this.isOffline()) return;
    this.router.navigate(['/app/operador/novedades', item.novedadId, 'edit']);
  }

  retry(): void {
    this.isOffline.set(false);
    void this.loadAnomalies();
  }
}
