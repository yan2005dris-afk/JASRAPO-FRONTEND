import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { OperatorRouteOfflineService } from '../rutas/data/operator-route-offline.service';
import type { OperatorRouteResponse } from '../rutas/domain/operator.models';

@Component({
  selector: 'app-operator-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
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

  readonly userInitials = computed(() => {
    const nombre = this.currentUser().nombre;
    const parts = nombre.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nombre.slice(0, 2).toUpperCase() || 'OP';
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
    return count;
  });

  readonly totalReadMeters = computed<number>(() => {
    let readCount = 0;
    const statusMap = this.readingStatusBySerie();
    for (const t of this.tasks()) {
      if (t.paradas?.length) {
        for (const p of t.paradas) {
          const st = statusMap.get(p.serie ?? '') ?? p.estado;
          if (
            st &&
            st !== 'PENDIENTE' &&
            st !== '__SIN_LECTURA__' &&
            st !== 'RECHAZADA_VERIFICACION'
          ) {
            readCount++;
          }
        }
      } else if (t.ordenesTrabajo?.length) {
        for (const o of t.ordenesTrabajo) {
          const serie =
            o.medidor?.serie ||
            (o.contrato?.numeroContrato
              ? String(o.contrato.numeroContrato)
              : `OT-${o.ordenTrabajoId}`);
          const st =
            statusMap.get(serie) ||
            statusMap.get(o.medidor?.serie ?? '') ||
            (o.ordenTrabajoId ? statusMap.get(String(o.ordenTrabajoId)) : null) ||
            (o.medidor?.medidorId ? statusMap.get(String(o.medidor.medidorId)) : null) ||
            o.estado;
          if (
            st &&
            st !== 'PENDIENTE' &&
            st !== '__SIN_LECTURA__' &&
            st !== 'RECHAZADA_VERIFICACION'
          ) {
            readCount++;
          }
        }
      } else if (t.medidor) {
        const st = statusMap.get(t.medidor.serie);
        if (
          st &&
          st !== 'PENDIENTE' &&
          st !== '__SIN_LECTURA__' &&
          st !== 'RECHAZADA_VERIFICACION'
        ) {
          readCount++;
        }
      }
    }
    return readCount;
  });

  readonly readingProgressPct = computed<number>(() => {
    const total = this.totalAssignedMeters();
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.totalReadMeters() / total) * 100));
  });

  readonly totalWorkOrders = computed<number>(() => {
    let count = 0;
    for (const t of this.tasks()) {
      count += t.ordenesTrabajo?.length || t.paradas?.length || t.rutaPuntos?.length || 1;
    }
    return count;
  });

  readonly heroActiveRoute = computed<OperatorRouteResponse | null>(() => {
    const all = this.tasks();
    return all.find((t) => t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA') ?? all[0] ?? null;
  });

  readonly nextPendingStop = computed(() => {
    const hero = this.heroActiveRoute();
    if (!hero) return null;
    const statusMap = this.readingStatusBySerie();

    if (hero.ordenesTrabajo?.length) {
      const sorted = hero.ordenesTrabajo.slice().sort((a, b) => a.ordenVisita - b.ordenVisita);
      for (const ord of sorted) {
        const serie = ord.medidor?.serie ?? '';
        const st = statusMap.get(serie) ?? ord.estado;
        if (!st || st === 'PENDIENTE' || st === '__SIN_LECTURA__') {
          return {
            ordenVisita: ord.ordenVisita,
            cliente: ord.contrato?.clienteNombre || 'Cliente sin nombre',
            direccion: ord.contrato?.direccion || 'Dirección no registrada',
            serie: ord.medidor?.serie || 'S/N',
            tipoActividad: ord.tipoActividad,
            ordenTrabajoId: ord.ordenTrabajoId,
          };
        }
      }
    }

    if (hero.paradas?.length) {
      for (let i = 0; i < hero.paradas.length; i++) {
        const p = hero.paradas[i];
        const st = statusMap.get(p.serie ?? '') ?? p.estado;
        if (!st || st === 'PENDIENTE' || st === '__SIN_LECTURA__') {
          return {
            ordenVisita: i + 1,
            cliente: p.clienteNombre || 'Cliente sin nombre',
            direccion: p.direccionSuministro || 'Dirección no registrada',
            serie: p.serie || 'S/N',
            tipoActividad: p.tipoActividad,
            ordenTrabajoId: p.ordenTrabajoId,
          };
        }
      }
    }

    return null;
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
      const operatorId = this.authService.currentUser()?.id;
      const scope = operatorId ? `operator:${operatorId}` : undefined;

      const [meters, initialRegistered, pending, synced] = await Promise.all([
        this.dbService.getMetersCache(),
        this.dbService.getRegisteredReadingsCache(scope),
        this.dbService.getPendingReadings(),
        this.dbService.getSyncedReadings().catch(() => []),
      ]);
      let registered = initialRegistered;

      if (this.networkService.isOnline()) {
        try {
          const fresh = (await this.syncService.getCurrentPeriodReadings()) as Record<
            string,
            unknown
          >[];
          if (fresh?.length) {
            await this.dbService.saveRegisteredReadingsCache(fresh, scope);
            registered = fresh as unknown as typeof initialRegistered;
          }
        } catch {
          // Fallback a caché
        }
      }

      const serieToId = new Map<string, string>();
      for (const m of meters) {
        serieToId.set(m.serie, m.medidorId.toString());
      }

      const idToEstado = new Map<string, string>();
      const statusMap = new Map<string, string>();

      // 1. Recibos locales previamente sincronizados (prioridad base)
      for (const s of synced) {
        const sId = s['medidorId'];
        const sEstado = s['estado'] || 'POR_REVISION';
        if (sId) idToEstado.set(sId.toString(), sEstado);
        const sSerie = s['medidorSerie'] || s['serie'];
        if (sSerie) statusMap.set(String(sSerie), sEstado);
      }
      // 2. Registradas autoritativas del servidor (sobrescribe histórico con APROBADA, RECHAZADA_VERIFICACION, etc.)
      for (const r of registered) {
        const mId = r.medidor?.medidorId ?? r.medidorId;
        if (mId) idToEstado.set(mId.toString(), r.estado);
        const s = r.medidor?.serie ?? r.medidorSerie;
        if (s) statusMap.set(String(s), r.estado);
      }
      // 3. Pendientes en cola local offline (máxima prioridad)
      for (const p of pending) {
        const pId = p['medidorId'];
        const pEstado = p['estado'] || 'POR_REVISION';
        if (pId) idToEstado.set(pId.toString(), pEstado);
        const pSerie = p['medidorSerie'] || p['serie'];
        if (pSerie) statusMap.set(String(pSerie), pEstado);
      }

      for (const [serie, id] of serieToId) {
        const estado = idToEstado.get(id);
        if (estado && !statusMap.has(serie)) statusMap.set(serie, estado);
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
    if (hero.paradas?.length) {
      for (const p of hero.paradas) {
        const st = statusMap.get(p.serie ?? '') ?? p.estado;
        if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__' && st !== 'RECHAZADA_VERIFICACION')
          read++;
      }
    } else if (hero.ordenesTrabajo?.length) {
      for (const o of hero.ordenesTrabajo) {
        const st = statusMap.get(o.medidor?.serie ?? '') ?? o.estado;
        if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__' && st !== 'RECHAZADA_VERIFICACION')
          read++;
      }
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

  goToPendingStop(stop: { serie?: string; tipoActividad?: string }): void {
    const hero = this.heroActiveRoute();
    this.router.navigate(['/app/operador/lecturas'], {
      queryParams: {
        rutaNombre: hero?.nombre,
        rutaTipo: hero?.tipoRuta,
        serie: stop.serie,
      },
    });
  }
}
