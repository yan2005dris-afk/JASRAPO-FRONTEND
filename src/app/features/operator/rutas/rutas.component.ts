import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { RouteTypePipe } from '../../../shared/pipes/route-type.pipe';
import type { OperatorRouteResponse } from '../models/operator.models';
import { OperatorRouteOfflineService } from '../service/operator-route-offline.service';
import { STATE_LABELS, FILTER_OPTIONS, STATE_FILTER_OPTIONS } from './rutas.constants';
import { RutasMapComponent, type MapPoint } from '../components/rutas-map/rutas-map.component';

import { AuthService } from '../../../core/services/auth.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';

type ViewMode = 'list' | 'map';

@Component({
  selector: 'app-rutas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouteTypePipe, RutasMapComponent],
  templateUrl: './rutas.component.html',
  styleUrl: './rutas.component.scss',
})
export class RutasComponent implements OnInit, OnDestroy {
  private readonly routeOfflineService = inject(OperatorRouteOfflineService);
  private readonly dbService = inject(IndexedDbService);
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();

  // ── Signals ──────────────────────────────────────────────────────────────
  readonly tasks = signal<OperatorRouteResponse[]>([]);
  readonly activeFilter = signal<string>('ALL');
  readonly activeStateFilter = signal<string>('ALL');
  readonly activeSectorFilter = signal<string>('ALL');
  readonly viewMode = signal<ViewMode>('list');
  readonly isLoading = signal<boolean>(false);
  readonly selectedTaskId = signal<string | null>(null);
  readonly readingStatusBySerie = signal<Map<string, string>>(new Map());
  readonly routesSource = signal<'network' | 'cache' | null>(null);
  readonly routesCachedAt = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);

  // ── Computed Dashboard & KPIs ───────────────────────────────────────────
  readonly currentUser = computed(() => {
    const user = this.authService.currentUser();
    const nombre = user?.name ? user.name.trim() : (user?.email?.split('@')[0] ?? 'Carlos M.');
    return {
      nombre,
      rol: user?.roleName || 'Operador de Campo',
      sector: 'Sector Olón',
    };
  });

  readonly totalAssignedMeters = computed<number>(() => {
    let count = 0;
    for (const t of this.tasks()) {
      count += this.getTaskPointCount(t);
    }
    return count > 0 ? count : 150;
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

  // ── Computed ─────────────────────────────────────────────────────────────
  // ── Sectores & Filtros Computados ─────────────────────────────────────────
  readonly availableSectors = computed<string[]>(() => {
    const set = new Set<string>();
    for (const t of this.tasks()) {
      if (t.descripcion?.trim()) {
        set.add(t.descripcion.trim());
      } else if (t.sectorId != null) {
        set.add(`Sector #${t.sectorId}`);
      } else if (t.comunidadId != null) {
        set.add(`Comunidad #${t.comunidadId}`);
      }
    }
    return Array.from(set);
  });

  readonly filteredTasks = computed<OperatorRouteResponse[]>(() => {
    const tipo = this.activeFilter();
    const estado = this.activeStateFilter();
    const sector = this.activeSectorFilter();

    return this.tasks().filter((t) => {
      if (tipo !== 'ALL' && t.tipoRuta !== tipo) return false;
      if (estado !== 'ALL' && t.estado !== estado) return false;
      if (sector !== 'ALL') {
        const desc = t.descripcion?.trim() || (t.sectorId ? `Sector #${t.sectorId}` : `Comunidad #${t.comunidadId}`);
        if (desc !== sector) return false;
      }
      return true;
    });
  });

  readonly mapPoints = computed<MapPoint[]>(() => {
    const activeSelectedId = this.selectedTaskId();
    const statusMap = this.readingStatusBySerie();

    const sortedTasks = this.filteredTasks();

    const points: MapPoint[] = [];

    for (const task of sortedTasks) {
      if (activeSelectedId !== null && task.rutaId !== activeSelectedId) continue;

      // 1. Puntos desde paradas / ordenesTrabajo (Backend real)
      const paradas = task.paradas;
      const ordenes = task.ordenesTrabajo;

      if (paradas && paradas.length > 0) {
        for (const p of paradas) {
          if (p.latitud != null && p.longitud != null) {
            points.push({
              routeId: task.rutaId,
              lat: p.latitud,
              lng: p.longitud,
              estado: statusMap.get(p.serie ?? '') ?? p.estado ?? '__SIN_LECTURA__',
              tipoRuta: p.tipoActividad ?? task.tipoRuta,
              popupHtml: `
                <div class="map-info">
                  <strong>${task.nombre}</strong>
                  <p style="margin:4px 0 0;font-size:11px;"><strong>Actividad:</strong> ${p.tipoActividad ?? task.tipoRuta}</p>
                  <p style="margin:2px 0 0;font-size:11px;"><strong>Serie:</strong> ${p.serie ?? 'N/A'}</p>
                  <p style="margin:2px 0 0;font-size:11px;"><strong>Cliente:</strong> ${p.clienteNombre ?? 'N/A'}</p>
                </div>
              `,
            });
          }
        }
      } else if (ordenes && ordenes.length > 0) {
        // Backend puede no garantizar orden estable entre requests; ordenamos acá
        // por ordenVisita para que la secuencia de visita sea consistente en UI.
        for (const ord of ordenes.slice().sort((a, b) => a.ordenVisita - b.ordenVisita)) {
          const lat = ord.medidor?.latitud;
          const lng = ord.medidor?.longitud;
          const serie = ord.medidor?.serie;
          if (lat != null && lng != null) {
            points.push({
              routeId: task.rutaId,
              lat,
              lng,
              estado: statusMap.get(serie ?? '') ?? ord.estado ?? '__SIN_LECTURA__',
              tipoRuta: ord.tipoActividad,
              popupHtml: `
                <div class="map-info">
                  <strong>${task.nombre}</strong>
                  <p style="margin:4px 0 0;font-size:11px;"><strong>Actividad:</strong> ${ord.tipoActividad}</p>
                  <p style="margin:2px 0 0;font-size:11px;"><strong>Serie:</strong> ${serie ?? 'N/A'}</p>
                  <p style="margin:2px 0 0;font-size:11px;"><strong>Cliente:</strong> ${ord.contrato?.clienteNombre ?? 'N/A'}</p>
                </div>
              `,
            });
          }
        }
      } else if (task.tipoRuta === 'TOMA_LECTURA' && task.rutaPuntos?.length) {
        for (const pt of task.rutaPuntos) {
          points.push({
            routeId: task.rutaId,
            lat: pt.latitud,
            lng: pt.longitud,
            estado: statusMap.get(pt.serie) ?? '__SIN_LECTURA__',
            tipoRuta: task.tipoRuta,
            popupHtml: `
              <div class="map-info">
                <strong>${task.nombre}</strong>
                <p style="margin:4px 0 0;font-size:11px;"><strong>Serie:</strong> ${pt.serie}</p>
                <p style="margin:2px 0 0;font-size:11px;"><strong>Cliente:</strong> ${pt.clienteNombre}</p>
              </div>
            `,
          });
        }
      } else if (task.medidor?.latitud != null && task.medidor?.longitud != null) {
        points.push({
          routeId: task.rutaId,
          lat: task.medidor.latitud,
          lng: task.medidor.longitud,
          estado: statusMap.get(task.medidor.serie) ?? '__SIN_LECTURA__',
          tipoRuta: task.tipoRuta,
          popupHtml: `
            <div class="map-info">
              <strong>${task.nombre}</strong>
              <p style="margin:4px 0 0;font-size:11px;"><strong>Serie:</strong> ${task.medidor.serie}</p>
              ${task.descripcion ? `<p style="margin:2px 0 0;font-size:10px;color:#597b7d;">${task.descripcion}</p>` : ''}
            </div>
          `,
        });
      }
    }

    return points;
  });

  // ── Exponer constantes al template ────────────────────────────────────────
  readonly filterOptions = FILTER_OPTIONS;
  readonly stateFilterOptions = STATE_FILTER_OPTIONS;
  readonly stateLabelMap = STATE_LABELS;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();
    // Al reconectarse, refrescar rutas: si el admin reasignó mientras el operador
    // estaba offline, debe ver la lista actualizada sin tener que salir y volver a entrar.
    this.networkService.connected$.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadAll());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  /** Carga rutas asignadas y estados de lecturas en paralelo. */
  private async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const [routeResult] = await Promise.all([
        this.routeOfflineService.loadAssignedRoutes(),
        this.loadReadingStatuses(),
      ]);
      this.tasks.set(routeResult.routes);
      this.routesSource.set(routeResult.source);
      this.routesCachedAt.set(routeResult.cachedAt);
    } catch (err) {
      this.tasks.set([]);
      this.routesSource.set(null);
      this.routesCachedAt.set(null);
      const raw = err instanceof Error ? err.message : String(err);
      this.loadError.set(this.translateLoadError(raw));
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Recarga manual de rutas (pull-to-refresh). */
  loadTasks(): void {
    this.loadAll();
  }

  /**
   * Mapea el mensaje crudo del servicio a un copy orientado al operador.
   * Tres causas reales distintas → tres acciones distintas del usuario.
   */
  private translateLoadError(raw: string): string {
    if (raw.includes('identificar al operador')) {
      return 'Tu sesión expiró. Volvé a iniciar sesión para cargar tus rutas.';
    }
    if (raw.includes('No hay rutas guardadas')) {
      return 'No hay rutas guardadas en este dispositivo. Conectate una vez para descargarlas.';
    }
    return 'No pudimos cargar las rutas. Verificá tu conexión y reintentá.';
  }

  /** Construye el mapa medidorSerie → estado desde IndexedDB. */
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
      // Sin caché — todos los marcadores en gris
    }
  }

  // ── Acciones de usuario ───────────────────────────────────────────────────

  setFilter(tipo: string): void {
    this.activeFilter.set(tipo);
    this.selectedTaskId.set(null);
  }

  setStateFilter(estado: string): void {
    this.activeStateFilter.set(estado);
    this.selectedTaskId.set(null);
  }

  setSectorFilter(sector: string): void {
    this.activeSectorFilter.set(sector);
    this.selectedTaskId.set(null);
  }

  toggleView(): void {
    const newMode = this.viewMode() === 'list' ? 'map' : 'list';
    this.viewMode.set(newMode);
    if (newMode === 'list') {
      this.selectedTaskId.set(null);
    }
  }

  selectTask(taskId: string | null): void {
    this.selectedTaskId.set(taskId);
  }

  viewOnMap(task: OperatorRouteResponse): void {
    this.selectedTaskId.set(task.rutaId);
    this.viewMode.set('map');
  }

  /**
   * Navega a la pantalla de lecturas filtrando por los medidores de esta ruta.
   * Usa click simple (compatible con táctil y escritorio).
   */
  openRoute(task: OperatorRouteResponse): void {
    const queryParams: Record<string, string> = {
      rutaNombre: task.nombre,
      rutaTipo: task.tipoRuta,
    };

    const paradas = task.paradas;
    const ordenes = task.ordenesTrabajo;

    if (paradas && paradas.length > 0) {
      queryParams['series'] = paradas
        .map((p) => p.serie)
        .filter((s): s is string => !!s)
        .join(',');
      // Para que LecturasComponent resuelva `activeTipoActividad` por medidor
      // y renderice el form correcto via @switch.
      const workOrders = paradas
        .filter((p) => !!p.serie && !!p.tipoActividad && !!p.ordenTrabajoId)
        .map((p) => `${p.serie}:${p.tipoActividad}:${p.ordenTrabajoId}:${p.estado}`);
      if (workOrders.length) {
        // Agrupa por serie para soportar multiples ordenes del mismo medidor:
        // SERIE1:TIPO1:ID1:ESTADO1;TIPO2:ID2:ESTADO2
        const grouped = new Map<string, string[]>();
        for (const wo of workOrders) {
          const [serie, tipo, ordenTrabajoId, estado] = wo.split(':');
          const assignments = grouped.get(serie) ?? [];
          assignments.push(`${tipo}:${ordenTrabajoId}:${estado}`);
          grouped.set(serie, assignments);
        }
        const merged: string[] = [];
        for (const [serie, assignments] of grouped) {
          merged.push(`${serie}:${assignments.join(';')}`);
        }
        queryParams['workOrders'] = merged.join(',');
      }
    } else if (ordenes && ordenes.length > 0) {
      queryParams['series'] = ordenes
        .map((ord) => ord.medidor?.serie)
        .filter((s): s is string => !!s)
        .join(',');
      // Misma idea: si las órdenes declaran tipoActividad (INSTALACION/INSPECCION/RECONEXION),
      // lo pasamos al form dinámico. Sin esto, los 3 forms nuevos son código muerto en producción.
      const workOrders = ordenes
        .filter((o) => !!o.medidor?.serie && !!o.tipoActividad && !!o.ordenTrabajoId)
        .map((o) => `${o.medidor!.serie}:${o.tipoActividad}:${o.ordenTrabajoId}:${o.estado}`);
      if (workOrders.length) {
        const grouped = new Map<string, string[]>();
        for (const wo of workOrders) {
          const [serie, tipo, ordenTrabajoId, estado] = wo.split(':');
          const assignments = grouped.get(serie) ?? [];
          assignments.push(`${tipo}:${ordenTrabajoId}:${estado}`);
          grouped.set(serie, assignments);
        }
        const merged: string[] = [];
        for (const [serie, assignments] of grouped) {
          merged.push(`${serie}:${assignments.join(';')}`);
        }
        queryParams['workOrders'] = merged.join(',');
      }
    } else if (task.tipoRuta === 'TOMA_LECTURA' && task.rutaPuntos?.length) {
      queryParams['series'] = task.rutaPuntos.map((pt) => pt.serie).join(',');
    } else if (task.medidor) {
      queryParams['serie'] = task.medidor.serie;
    }

    this.router.navigate(['/app/operador/lecturas'], { queryParams });
  }

  getStateLabel(estado: string): string {
    return this.stateLabelMap[estado] ?? estado;
  }

  taskHasMapPoints(task: OperatorRouteResponse): boolean {
    return this.getTaskPointCount(task) > 0;
  }

  taskHasMeterCoordinates(task: OperatorRouteResponse): boolean {
    return Number.isFinite(task.medidor?.latitud) && Number.isFinite(task.medidor?.longitud);
  }

  getTaskPointCount(task: OperatorRouteResponse): number {
    if (task.paradas?.length) {
      return task.paradas.length;
    }
    if (task.ordenesTrabajo?.length) {
      return task.ordenesTrabajo.length;
    }
    if (task.rutaPuntos?.length) return task.rutaPuntos.length;
    return task.medidor ? 1 : 0;
  }

  getTaskFirstClient(task: OperatorRouteResponse): string | null {
    if (task.paradas?.length) {
      const first = task.paradas.find((p) => p.clienteNombre?.trim());
      if (first?.clienteNombre) return first.clienteNombre;
    }
    if (task.ordenesTrabajo?.length) {
      const first = task.ordenesTrabajo.find((o) => o.contrato?.clienteNombre?.trim());
      if (first?.contrato?.clienteNombre) return first.contrato.clienteNombre;
    }
    if (task.rutaPuntos?.length) {
      const first = task.rutaPuntos.find((pt) => pt.clienteNombre?.trim());
      if (first?.clienteNombre) return first.clienteNombre;
    }
    return null;
  }

  getTaskSectorDescription(task: OperatorRouteResponse): string {
    if (task.descripcion?.trim()) return task.descripcion.trim();
    if (task.sectorId != null) return `Sector #${task.sectorId}`;
    if (task.comunidadId != null) return `Comunidad #${task.comunidadId}`;
    return 'Sector Olón';
  }

  /**
   * Label del botón principal de cada ruta según tipoRuta.
   * Antes mostraba "Lecturas" universal — bug UX.
   */
  actionLabelFor(task: OperatorRouteResponse): string {
    switch (task.tipoRuta) {
      case 'INSTALACION':
        return 'Instalación';
      case 'INSPECCION':
        return 'Inspección';
      case 'RECONEXION':
        return 'Reconexión';
      default:
        return 'Lecturas';
    }
  }

  /**
   * Ícono Bootstrap Icons para el botón según tipoRuta.
   * Mantiene consistencia con TIPO_ICONS en rutas.constants.ts.
   */
  actionIconFor(task: OperatorRouteResponse): string {
    switch (task.tipoRuta) {
      case 'INSTALACION':
        return 'bi-tools';
      case 'INSPECCION':
        return 'bi-search';
      case 'RECONEXION':
        return 'bi-plug-fill';
      default:
        return 'bi-droplet-fill';
    }
  }

  getTaskReadCount(task: OperatorRouteResponse): number {
    let readCount = 0;
    const statusMap = this.readingStatusBySerie();
    if (task.paradas?.length) {
      for (const p of task.paradas) {
        const st = statusMap.get(p.serie ?? '') ?? p.estado;
        if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__') {
          readCount++;
        }
      }
    } else if (task.ordenesTrabajo?.length) {
      for (const o of task.ordenesTrabajo) {
        const st = statusMap.get(o.medidor?.serie ?? '') ?? o.estado;
        if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__') {
          readCount++;
        }
      }
    } else if (task.medidor) {
      const st = statusMap.get(task.medidor.serie);
      if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__') {
        readCount = 1;
      }
    }
    return readCount;
  }

  getTaskProgressPct(task: OperatorRouteResponse): number {
    const total = this.getTaskPointCount(task);
    if (total === 0) return 0;
    const read = this.getTaskReadCount(task);
    return Math.min(100, Math.round((read / total) * 100));
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
