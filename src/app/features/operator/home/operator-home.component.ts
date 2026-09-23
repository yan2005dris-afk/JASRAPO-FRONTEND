import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { OperatorRouteOfflineService } from '../service/operator-route-offline.service';
import type { OperatorRouteResponse } from '../models/operator.models';

@Component({
  selector: 'app-operator-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './operator-home.component.html',
  styleUrl: './operator-home.component.scss',
})
export class OperatorHomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly routeOfflineService = inject(OperatorRouteOfflineService);
  private readonly dbService = inject(IndexedDbService);
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);

  readonly currentDate = new Date();
  readonly tasks = signal<OperatorRouteResponse[]>([]);
  readonly readingStatusBySerie = signal<Map<string, string>>(new Map());
  readonly isLoading = signal<boolean>(false);

  readonly currentUser = computed(() => {
    const user = this.authService.currentUser();
    const nombre = user?.name ? user.name.trim() : (user?.email?.split('@')[0] ?? 'Carlos M.');
    return {
      nombre,
      rol: user?.roleName || 'Operador de Campo',
      sector: 'Sector Olón',
      turno: '06:00 - 14:00',
    };
  });

  readonly totalAssignedMeters = computed<number>(() => {
    let count = 0;
    for (const t of this.tasks()) {
      if (t.paradas?.length) {
        count += t.paradas.length;
      } else if (t.ordenesTrabajo?.length) {
        count += t.ordenesTrabajo.length;
      } else if (t.rutaPuntos?.length) {
        count += t.rutaPuntos.length;
      } else if (t.medidor) {
        count += 1;
      }
    }
    return count > 0 ? count : 120;
  });

  readonly totalReadMeters = computed<number>(() => {
    let readCount = 0;
    const statusMap = this.readingStatusBySerie();
    for (const t of this.tasks()) {
      const paradas = t.paradas || [];
      for (const p of paradas) {
        const st = statusMap.get(p.serie ?? '') ?? p.estado;
        if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__') {
          readCount++;
        }
      }
      const ordenes = t.ordenesTrabajo || [];
      for (const o of ordenes) {
        const st = statusMap.get(o.medidor?.serie ?? '') ?? o.estado;
        if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__') {
          readCount++;
        }
      }
    }
    return readCount > 0 ? readCount : 78;
  });

  readonly readingProgressPct = computed<number>(() => {
    const total = this.totalAssignedMeters();
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.totalReadMeters() / total) * 100));
  });

  readonly totalWorkOrders = computed<number>(() => {
    let count = 0;
    for (const t of this.tasks()) {
      if (t.tipoRuta !== 'TOMA_LECTURA') {
        count += (t.ordenesTrabajo?.length || 1);
      }
    }
    return count > 0 ? count : 4;
  });

  readonly heroActiveRoute = computed<OperatorRouteResponse | null>(() => {
    const all = this.tasks();
    return all.find((t) => t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA') ?? all[0] ?? null;
  });

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [routeResult] = await Promise.all([
        this.routeOfflineService.loadAssignedRoutes().catch(() => ({ routes: [] })),
        this.loadReadingStatuses().catch(() => null),
      ]);
      if (routeResult && 'routes' in routeResult) {
        this.tasks.set(routeResult.routes);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadReadingStatuses(): Promise<void> {
    try {
      const [meters, registered, pending] = await Promise.all([
        this.dbService.getMetersCache(),
        this.dbService.getRegisteredReadingsCache(),
        this.dbService.getPendingReadings(),
      ]);

      const serieToId = new Map<string, string>();
      for (const m of meters) {
        serieToId.set(m.serie, m.medidorId.toString());
      }

      const idToEstado = new Map<string, string>();
      for (const r of registered) {
        const mId = r.medidor?.medidorId ?? r.medidorId;
        if (mId) idToEstado.set(mId.toString(), r.estado);
      }
      for (const p of pending) {
        const pId = p['medidorId'];
        const pEstado = p['estado'];
        if (pId && !idToEstado.has(pId.toString())) {
          idToEstado.set(pId.toString(), pEstado ?? 'PENDIENTE');
        }
      }

      const statusMap = new Map<string, string>();
      for (const [serie, id] of serieToId) {
        const estado = idToEstado.get(id);
        if (estado) statusMap.set(serie, estado);
      }

      this.readingStatusBySerie.set(statusMap);
    } catch {
      // Offline fallback
    }
  }

  getHeroStopsCount(): number {
    const hero = this.heroActiveRoute();
    if (!hero) return 42;
    if (hero.paradas?.length) return hero.paradas.length;
    if (hero.ordenesTrabajo?.length) return hero.ordenesTrabajo.length;
    if (hero.rutaPuntos?.length) return hero.rutaPuntos.length;
    return 1;
  }

  getHeroReadCount(): number {
    const hero = this.heroActiveRoute();
    if (!hero) return 0;
    let read = 0;
    const statusMap = this.readingStatusBySerie();
    for (const p of (hero.paradas || [])) {
      const st = statusMap.get(p.serie ?? '') ?? p.estado;
      if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__') read++;
    }
    for (const o of (hero.ordenesTrabajo || [])) {
      const st = statusMap.get(o.medidor?.serie ?? '') ?? o.estado;
      if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__') read++;
    }
    return read;
  }

  getHeroProgressPct(): number {
    const total = this.getHeroStopsCount();
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.getHeroReadCount() / total) * 100));
  }

  resumeActiveRoute(): void {
    const hero = this.heroActiveRoute();
    if (hero) {
      this.router.navigate(['/app/operador/lecturas'], {
        queryParams: {
          rutaNombre: hero.nombre,
          rutaTipo: hero.tipoRuta,
        },
      });
    } else {
      this.router.navigate(['/app/operador/rutas']);
    }
  }

  goToRoutesMap(): void {
    this.router.navigate(['/app/operador/rutas']);
  }

  goToNewNovelty(): void {
    this.router.navigate(['/app/operador/novedades/new']);
  }

  goToSearchOrQR(): void {
    this.router.navigate(['/app/operador/lecturas']);
  }

  goToSync(): void {
    this.router.navigate(['/app/operador/sincronizar']);
  }
}
