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
import { IndexedDbService } from '../../../../core/services/indexed-db.service';
import { NetworkService } from '../../../../core/services/network.service';
import { RouteTypePipe } from '../../../../shared/pipes/route-type.pipe';
import type {
  OperatorRouteResponse,
  RouteType,
  OperatorActivityType,
  OperatorWorkOrder,
  OperatorParada,
  RoutePoint,
} from '../domain/operator.models';
import {
  classifyRouteLoadError,
  type OperatorRouteErrorInfo,
  OperatorRouteOfflineService,
} from '../data/operator-route-offline.service';
import {
  compareRoutesCanonically,
  isReadingRouteType,
  nextPendingWorkOrder,
  routeMatchesTypeFilter,
} from '../../readings/domain/reading-order.rules';
import {
  formatDistance as formatDistanceUtil,
  haversineMeters,
  type LatLng,
} from '../../../../shared/utils/geo.utils';
import { RutasMapComponent, type MapPoint } from '../components/rutas-map/rutas-map.component';

import { AuthService } from '../../../../core/services/auth.service';
import { OperatorSyncService } from '../../../../core/services/operator-sync.service';

const STATE_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

const STATE_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Todos los estados', value: 'ALL' },
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'En Progreso', value: 'EN_PROGRESO' },
  { label: 'Completadas', value: 'COMPLETADA' },
];

type ViewMode = 'list' | 'map';

interface RouteGroup {
  id: string;
  label: string | null;
  routeCount: number;
  routes: OperatorRouteResponse[];
}

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
  readonly comunidadesCatalog = signal<Map<number, string>>(new Map());
  readonly sectoresCatalog = signal<Map<number, string>>(new Map());
  readonly activeFilter = signal<string>('ALL');
  readonly activeStateFilter = signal<string>('ALL');
  readonly activeComunidadFilter = signal<string>('ALL');
  readonly viewMode = signal<ViewMode>('list');
  readonly isLoading = signal<boolean>(false);
  readonly selectedTaskId = signal<string | null>(null);
  readonly readingStatusBySerie = signal<Map<string, string>>(new Map());
  readonly routesSource = signal<'network' | 'cache' | null>(null);
  readonly routesCachedAt = signal<string | null>(null);
  readonly loadError = signal<OperatorRouteErrorInfo | null>(null);
  private readonly userPosition = signal<LatLng | null>(null);

  /** Frecuencia mínima entre actualizaciones del signal userPosition (~1 Hz). */
  private static readonly USER_POSITION_THROTTLE_MS = 1000;
  private lastUserPositionAt = 0;

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
    return count;
  });

  readonly totalReadMeters = computed<number>(() => {
    let readCount = 0;
    const statusMap = this.readingStatusBySerie();
    for (const t of this.tasks()) {
      const paradas = t.paradas || [];
      for (const p of paradas) {
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
      const ordenes = t.ordenesTrabajo || [];
      for (const o of ordenes) {
        const st = statusMap.get(o.medidor?.serie ?? '') ?? o.estado;
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
      if (t.tipoRuta !== 'LECTURA') {
        count += t.ordenesTrabajo?.length || 1;
      }
    }
    return count > 0 ? count : 4;
  });

  readonly heroActiveRoute = computed<OperatorRouteResponse | null>(() => {
    const all = this.tasks();
    return all.find((t) => t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA') ?? all[0] ?? null;
  });

  // Los filtros de tipo/estado se aplican antes de formar la jerarquía.
  readonly routesForNavigation = computed(() =>
    this.tasks()
      .filter(
        (task) =>
          routeMatchesTypeFilter(task.tipoRuta, this.activeFilter()) &&
          (this.activeStateFilter() === 'ALL' || task.estado === this.activeStateFilter()),
      )
      .sort(compareRoutesCanonically),
  );

  readonly availableComunidades = computed<{ id: string; label: string; routeCount: number }[]>(
    () => {
      const groups = new Map<string, { id: string; label: string; routeCount: number }>();
      for (const task of this.routesForNavigation()) {
        const id = String(task.comunidadId);
        const group = groups.get(id);
        if (group) {
          group.routeCount++;
        } else {
          groups.set(id, {
            id,
            label: this.getTaskComunidadDescription(task),
            routeCount: 1,
          });
        }
      }
      return [...groups.values()].sort((a, b) => Number(a.id) - Number(b.id));
    },
  );

  readonly selectedComunidadLabel = computed(() => {
    const task = this.tasks().find(
      (route) => String(route.comunidadId) === this.activeComunidadFilter(),
    );
    return task ? this.getTaskComunidadDescription(task) : undefined;
  });

  readonly selectedCommunityHasSectors = computed(() => this.activeComunidadFilter() === '1');

  readonly filteredTasks = computed<OperatorRouteResponse[]>(() => {
    const communityId = this.activeComunidadFilter();
    return this.routesForNavigation().filter(
      (task) => communityId === 'ALL' || String(task.comunidadId) === communityId,
    );
  });

  readonly routeGroups = computed<RouteGroup[]>(() => {
    const routes = this.filteredTasks();
    if (routes.length === 0) return [];

    if (this.activeComunidadFilter() === 'ALL') {
      const groups = new Map<string, RouteGroup>();
      for (const task of routes) {
        const id = task.comunidadId == null ? 'NONE' : String(task.comunidadId);
        const group = groups.get(id);
        if (group) {
          group.routeCount++;
          group.routes.push(task);
        } else {
          groups.set(id, {
            id,
            label: id === 'NONE' ? 'Otras comunidades' : this.getTaskComunidadDescription(task),
            routeCount: 1,
            routes: [task],
          });
        }
      }
      return [...groups.values()];
    }

    if (!this.selectedCommunityHasSectors()) {
      return [{ id: 'DIRECT', label: null, routeCount: routes.length, routes }];
    }

    const groups = new Map<string, RouteGroup>();
    for (const task of routes) {
      const id = task.sectorId == null ? 'NONE' : String(task.sectorId);
      const group = groups.get(id);
      if (group) {
        group.routeCount++;
        group.routes.push(task);
      } else {
        groups.set(id, {
          id,
          label: id === 'NONE' ? 'Sin Sector' : this.getTaskSectorDescription(task),
          routeCount: 1,
          routes: [task],
        });
      }
    }
    return [...groups.values()].sort((a, b) =>
      a.id === 'NONE' ? 1 : b.id === 'NONE' ? -1 : Number(a.id) - Number(b.id),
    );
  });

  readonly mapPoints = computed<MapPoint[]>(() => {
    const activeSelectedId = this.selectedTaskId();
    const statusMap = this.readingStatusBySerie();

    const sortedTasks = this.filteredTasks();
    const activityTypes = this.activityTypes();
    const iconMap = new Map<string, string>(
      activityTypes.map((t) => [t.codigo, t.icono ?? 'bi-geo-alt-fill']),
    );
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
              icon: iconMap.get(p.tipoActividad ?? task.tipoRuta),
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
        for (const ord of ordenes.slice().sort((a: OperatorWorkOrder, b: OperatorWorkOrder) => a.ordenVisita - b.ordenVisita)) {
          const lat = ord.contrato?.latitud;
          const lng = ord.contrato?.longitud;
          const serie = ord.medidor?.serie;
          if (lat != null && lng != null) {
            points.push({
              routeId: task.rutaId,
              lat,
              lng,
              estado: statusMap.get(serie ?? '') ?? ord.estado ?? '__SIN_LECTURA__',
              tipoRuta: ord.tipoActividad,
              icon: iconMap.get(ord.tipoActividad),
              pointKey: `${task.rutaId}:${ord.ordenTrabajoId}`,
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
      } else if (isReadingRouteType(task.tipoRuta) && task.rutaPuntos?.length) {
        for (const pt of task.rutaPuntos) {
          points.push({
            routeId: task.rutaId,
            lat: pt.latitud,
            lng: pt.longitud,
            estado: statusMap.get(pt.serie) ?? '__SIN_LECTURA__',
            tipoRuta: task.tipoRuta,
            icon: iconMap.get(task.tipoRuta),
            popupHtml: `
              <div class="map-info">
                <strong>${task.nombre}</strong>
                <p style="margin:4px 0 0;font-size:11px;"><strong>Serie:</strong> ${pt.serie}</p>
                <p style="margin:2px 0 0;font-size:11px;"><strong>Cliente:</strong> ${pt.clienteNombre}</p>
              </div>
            `,
          });
        }
      }
    }

    return points;
  });

  /**
   * Distancia (m) desde la posición del operador hasta la próxima parada PENDIENTE
   * (por ordenVisita) de cada ruta filtrada. Vacío mientras no haya fix GPS.
   * Regla de negocio: primera orden PENDIENTE por ordenVisita, NO mínima haversiana.
   */
  readonly nextStopDistanceByRoute = computed<Map<string, number>>(() => {
    const position = this.userPosition();
    const distances = new Map<string, number>();
    if (!position) return distances;
    for (const task of this.filteredTasks()) {
      const next = nextPendingWorkOrder(task);
      if (!next) continue;
      const contract = next.contrato;
      if (contract?.latitud == null || contract?.longitud == null) continue;
      distances.set(
        task.rutaId,
        haversineMeters(position, { lat: contract.latitud, lng: contract.longitud }),
      );
    }
    return distances;
  });

  /** Distancia a la próxima parada de la ruta seleccionada (para tooltip y popup). */
  readonly selectedNextStopDistance = computed<number | null>(() => {
    const selectedId = this.selectedTaskId();
    if (selectedId === null) return null;
    return this.nextStopDistanceByRoute().get(selectedId) ?? null;
  });

  /** Identidad del punto de próxima parada (`<rutaId>:<ordenTrabajoId>`) dentro de `mapPoints`. */
  readonly selectedNextStopPointKey = computed<string | null>(() => {
    const selectedId = this.selectedTaskId();
    if (selectedId === null) return null;
    const task = this.filteredTasks().find((t) => t.rutaId === selectedId);
    if (!task) return null;
    const next = nextPendingWorkOrder(task);
    return next ? `${task.rutaId}:${next.ordenTrabajoId}` : null;
  });

  // ── Exponer constantes al template ────────────────────────────────────────
  readonly filterOptions = signal<{ label: string; value: string }[]>([
    { label: 'Todas', value: 'ALL' },
  ]);
  readonly activityTypes = signal<OperatorActivityType[]>([]);
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

  // ── Proximidad GPS ─────────────────────────────────────────────────────────

  /**
   * Recibe cada fix del mapa (el marcador del operador siempre sigue la posición en vivo),
   * pero el signal userPosition se actualiza como máximo ~1 Hz para no recalcular
   * distancias y recomponer señales más rápido de lo que el GPS móvil entrega info útil.
   */
  onUserPositionChange(position: LatLng): void {
    const now = Date.now();
    if (now - this.lastUserPositionAt < RutasComponent.USER_POSITION_THROTTLE_MS) return;
    this.lastUserPositionAt = now;
    this.userPosition.set(position);
  }

  /** Distancia legible ("X m" / "X.X km") para el badge de proximidad. */
  formatDistance(meters: number): string {
    return formatDistanceUtil(meters);
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  /** Carga rutas asignadas y estados de lecturas en paralelo. */
  private async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const [routeResult, comCache, secCache, activityTypes] = await Promise.all([
        this.routeOfflineService.loadAssignedRoutes(),
        this.dbService.getComunidadesCache().catch(() => []),
        this.dbService.getSectoresCache().catch(() => []),
        this.routeOfflineService.loadActivityTypes().catch(() => []),
        this.loadReadingStatuses(),
      ]);
      const comMap = new Map<number, string>(comCache.map((c) => [c.comunidadId, c.nombre]));
      const secMap = new Map<number, string>(secCache.map((s) => [s.sectorId, s.nombre]));

      if (activityTypes.length > 0) {
        this.activityTypes.set(activityTypes);
        this.filterOptions.set([
          { label: 'Todas', value: 'ALL' },
          ...activityTypes.map((t) => ({ label: t.nombre, value: t.codigo })),
        ]);
      }

      // Auto-cosechar comunidades y sectores nuevos provenientes de la respuesta del backend
      const newComunidades: { comunidadId: number; nombre: string }[] = [];
      const newSectores: { sectorId: number; comunidadId?: number; nombre: string }[] = [];

      for (const r of routeResult.routes || []) {
        if (
          r.comunidadId != null &&
          r.comunidadNombre?.trim() &&
          comMap.get(Number(r.comunidadId)) !== r.comunidadNombre
        ) {
          comMap.set(Number(r.comunidadId), r.comunidadNombre);
          newComunidades.push({
            comunidadId: Number(r.comunidadId),
            nombre: r.comunidadNombre,
          });
        }
        if (
          r.sectorId != null &&
          r.sectorNombre?.trim() &&
          secMap.get(Number(r.sectorId)) !== r.sectorNombre
        ) {
          secMap.set(Number(r.sectorId), r.sectorNombre);
          newSectores.push({
            sectorId: Number(r.sectorId),
            comunidadId: r.comunidadId != null ? Number(r.comunidadId) : undefined,
            nombre: r.sectorNombre,
          });
        }
      }

      if (newComunidades.length > 0) {
        this.dbService.saveComunidadesCache(newComunidades).catch(() => undefined);
      }
      if (newSectores.length > 0) {
        this.dbService.saveSectoresCache(newSectores).catch(() => undefined);
      }

      this.comunidadesCatalog.set(comMap);
      this.sectoresCatalog.set(secMap);

      const normalizedRoutes: OperatorRouteResponse[] = (routeResult.routes || []).map(
        (r, idx: number) => {
          const comId = r.comunidadId != null ? Number(r.comunidadId) : undefined;
          const secId = r.sectorId != null ? Number(r.sectorId) : undefined;
          const comunidadNombre = r.comunidadNombre?.trim()
            ? r.comunidadNombre
            : comId != null
              ? comMap.get(comId)
              : undefined;
          const sectorNombre = r.sectorNombre?.trim()
            ? r.sectorNombre
            : secId != null
              ? secMap.get(secId)
              : undefined;
          return {
            ...r,
            rutaId: String(r.rutaId || idx + 1),
            tipoRuta: r.tipoRuta || 'LECTURA',
            estado: r.estado || 'PENDIENTE',
            nombre: r.nombre || `Ruta ${r.tipoRuta || 'LECTURA'} #${idx + 1}`,
            comunidadNombre,
            sectorNombre,
            paradas: Array.isArray(r.paradas) ? r.paradas : [],
            ordenesTrabajo: Array.isArray(r.ordenesTrabajo) ? r.ordenesTrabajo : [],
          };
        },
      );
      this.tasks.set(normalizedRoutes);
      const navigableRoutes = normalizedRoutes.filter(
        (route) =>
          routeMatchesTypeFilter(route.tipoRuta, this.activeFilter()) &&
          (this.activeStateFilter() === 'ALL' || route.estado === this.activeStateFilter()),
      );
      if (
        this.activeComunidadFilter() !== 'ALL' &&
        !navigableRoutes.some((route) => String(route.comunidadId) === this.activeComunidadFilter())
      ) {
        this.setComunidadFilter('ALL');
      }
      this.routesSource.set(routeResult.source);
      this.routesCachedAt.set(routeResult.cachedAt);
      this.loadError.set(routeResult.error);
    } catch (err) {
      this.tasks.set([]);
      this.routesSource.set(null);
      this.routesCachedAt.set(null);
      this.loadError.set(this.translateLoadErrorInfo(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Recarga manual de rutas (pull-to-refresh). */
  loadTasks(): void {
    this.loadAll();
  }

  /**
   * Mapea un error de carga SIN fallback de caché a información estructurada para la UI.
   * Se conserva el copy específico de los dos casos especiales de este servicio y se delega
   * en classifyRouteLoadError para el resto (negocio vs red).
   */
  private translateLoadErrorInfo(err: unknown): OperatorRouteErrorInfo {
    if (err instanceof Error && err.message.includes('identificar al operador')) {
      return {
        kind: 'auth',
        message: 'Tu sesión expiró. Volvé a iniciar sesión para cargar tus rutas.',
        retryable: false,
      };
    }
    if (err instanceof Error && err.message.includes('No hay rutas guardadas')) {
      return {
        kind: 'network',
        message: 'No hay rutas guardadas en este dispositivo. Conectate una vez para descargarlas.',
        retryable: true,
      };
    }
    return classifyRouteLoadError(err);
  }

  /** Título del bloque de error según el tipo de falla (sin caché disponible). */
  loadErrorTitle(): string {
    const info = this.loadError();
    if (!info) return '';
    if (info.kind === 'business') return 'Error de sincronización';
    if (info.kind === 'auth') return 'Sesión expirada';
    return 'Mapa offline no preparado';
  }

  /** Construye el mapa medidorSerie → estado desde IndexedDB. */
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
        if (s['numeroGuia'] || s['numeroContrato']) {
          statusMap.set(String(s['numeroGuia'] || s['numeroContrato']), sEstado);
        }
        if (s['ordenTrabajoId']) {
          statusMap.set(String(s['ordenTrabajoId']), sEstado);
          statusMap.set(`OT-${s['ordenTrabajoId']}`, sEstado);
        }
      }
      // 2. Registradas autoritativas del servidor (sobrescribe histórico con APROBADA, RECHAZADA_VERIFICACION, etc.)
      for (const r of registered) {
        const mId = r.medidor?.medidorId ?? r.medidorId;
        if (mId) idToEstado.set(mId.toString(), r.estado);
        const s = r.medidor?.serie ?? r.medidorSerie;
        if (s) statusMap.set(String(s), r.estado);
        const guia = r.contrato?.numeroGuia ?? (r as unknown as Record<string, unknown>)['numeroGuia'] ?? (r as unknown as Record<string, unknown>)['numeroContrato'];
        if (guia) statusMap.set(String(guia), r.estado);
        const otId = (r as unknown as Record<string, unknown>)['ordenTrabajoId'];
        if (otId != null && otId !== '') {
          statusMap.set(String(otId), r.estado);
          statusMap.set(`OT-${otId}`, r.estado);
        }
      }
      // 3. Pendientes en cola local offline (máxima prioridad)
      for (const p of pending) {
        const pId = p['medidorId'];
        const pEstado = p['estado'] || 'POR_REVISION';
        if (pId) idToEstado.set(pId.toString(), pEstado);
        const pSerie = p['medidorSerie'] || p['serie'];
        if (pSerie) statusMap.set(String(pSerie), pEstado);
        if (p['numeroGuia'] || p['numeroContrato']) {
          statusMap.set(String(p['numeroGuia'] || p['numeroContrato']), pEstado);
        }
        if (p['ordenTrabajoId']) {
          statusMap.set(String(p['ordenTrabajoId']), pEstado);
          statusMap.set(`OT-${p['ordenTrabajoId']}`, pEstado);
        }
      }

      for (const [serie, id] of serieToId) {
        const estado = idToEstado.get(id);
        if (estado && !statusMap.has(serie)) statusMap.set(serie, estado);
      }

      this.readingStatusBySerie.set(statusMap);
    } catch {
      // Sin caché — todos los marcadores en gris
    }
  }

  // ── Acciones de usuario ───────────────────────────────────────────────────

  setFilter(tipo: string): void {
    this.activeFilter.set(tipo);
    this.viewMode.set('list');
    this.selectedTaskId.set(null);
  }

  setStateFilter(estado: string): void {
    this.activeStateFilter.set(estado);
    this.viewMode.set('list');
    this.selectedTaskId.set(null);
  }

  setComunidadFilter(comunidad: string): void {
    this.activeComunidadFilter.set(comunidad);
    this.viewMode.set('list');
    this.selectedTaskId.set(null);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'list') {
      this.selectedTaskId.set(null);
    }
  }

  toggleView(): void {
    const newMode = this.viewMode() === 'list' ? 'map' : 'list';
    this.setViewMode(newMode);
  }

  selectTask(taskId: string | null): void {
    this.selectedTaskId.set(taskId);
  }

  viewOnMap(task: OperatorRouteResponse): void {
    this.selectedTaskId.set(task.rutaId);
    this.viewMode.set('map');
  }

  /**
   * Resuelve el tipo de ruta de forma robusta con fallback a las actividades de sus órdenes/paradas.
   */
  resolveTaskTipoRuta(task: OperatorRouteResponse): RouteType {
    if (task?.tipoRuta) return task.tipoRuta;
    if (task?.paradas?.length && task.paradas[0].tipoActividad) {
      return task.paradas[0].tipoActividad as RouteType;
    }
    if (task?.ordenesTrabajo?.length && task.ordenesTrabajo[0].tipoActividad) {
      return task.ordenesTrabajo[0].tipoActividad as RouteType;
    }
    return 'LECTURA';
  }

  /**
   * Navega a la pantalla de lecturas/órdenes filtrando por los medidores u órdenes de esta ruta.
   * Soporta tanto órdenes con medidor instalado como órdenes sin medidor (Inspección, Instalación nueva).
   */
  openRoute(task: OperatorRouteResponse): void {
    const tipoRuta = this.resolveTaskTipoRuta(task);
    const queryParams: Record<string, string> = {
      rutaId: task.rutaId,
      rutaNombre: task.nombre,
      rutaTipo: tipoRuta,
    };

    try {
      sessionStorage.setItem('activeOperatorRoute', JSON.stringify(task));
    } catch {
      // Ignore quota error if any
    }

    const paradas = task.paradas ?? [];
    const ordenes = task.ordenesTrabajo ?? [];

    const orderIdentifiers: string[] = [];
    const workOrderEntries: string[] = [];

    if (ordenes.length > 0) {
      for (const ord of ordenes) {
        const id = ord.medidor?.serie || ord.contrato?.numeroContrato || `OT-${ord.ordenTrabajoId}`;
        orderIdentifiers.push(id);
        const rutaRef = (ord as unknown as Record<string, unknown>)['ruta'] as
          { tipoActividad?: { codigo?: string } } | undefined;
        const actTipo = ord.tipoActividad || rutaRef?.tipoActividad?.codigo || tipoRuta;
        if (actTipo && ord.ordenTrabajoId) {
          const lecId = ord.lecturaId ? String(ord.lecturaId) : '';
          workOrderEntries.push(
            `${id}:${actTipo}:${ord.ordenTrabajoId}:${ord.estado || 'PENDIENTE'}:${lecId}`,
          );
        }
      }
    } else if (paradas.length > 0) {
      for (const p of paradas) {
        const id = p.serie || `OT-${p.ordenTrabajoId}`;
        orderIdentifiers.push(id);
        const actTipo = p.tipoActividad || tipoRuta;
        if (actTipo && p.ordenTrabajoId) {
          workOrderEntries.push(`${id}:${actTipo}:${p.ordenTrabajoId}:${p.estado || 'PENDIENTE'}:`);
        }
      }
    } else if (isReadingRouteType(tipoRuta) && task.rutaPuntos?.length) {
      orderIdentifiers.push(...task.rutaPuntos.map((pt: RoutePoint) => pt.serie));
    } else if (task.medidor) {
      orderIdentifiers.push(task.medidor.serie);
    }

    if (orderIdentifiers.length > 0) {
      queryParams['series'] = orderIdentifiers.join(',');
      if (orderIdentifiers.length === 1) {
        queryParams['serie'] = orderIdentifiers[0];
      }
    }

    if (workOrderEntries.length > 0) {
      const grouped = new Map<string, string[]>();
      for (const wo of workOrderEntries) {
        const [id, tipo, ordenTrabajoId, estado, lecturaId = ''] = wo.split(':');
        const assignments = grouped.get(id) ?? [];
        assignments.push(
          lecturaId
            ? `${tipo}:${ordenTrabajoId}:${estado}:${lecturaId}`
            : `${tipo}:${ordenTrabajoId}:${estado}`,
        );
        grouped.set(id, assignments);
      }
      const merged: string[] = [];
      for (const [id, assignments] of grouped) {
        merged.push(`${id}:${assignments.join(';')}`);
      }
      queryParams['workOrders'] = merged.join(',');
    }

    this.router.navigate(['/app/operador/lecturas'], {
      queryParams,
      state: { route: task },
    });
  }

  getStateLabel(estado: string): string {
    return this.stateLabelMap[estado] ?? estado;
  }

  taskHasMapPoints(task: OperatorRouteResponse): boolean {
    return this.getTaskPointCount(task) > 0;
  }

  taskHasMeterCoordinates(task: OperatorRouteResponse): boolean {
    return this.taskHasMapPoints(task);
  }

  getTaskPointCount(task: OperatorRouteResponse): number {
    if (task.paradas?.length) {
      return task.paradas.length;
    }
    if (task.ordenesTrabajo?.length) {
      return task.ordenesTrabajo.length;
    }
    if (task.rutaPuntos?.length) return task.rutaPuntos.length;
    return 0;
  }

  getTaskFirstClient(task: OperatorRouteResponse): string | null {
    if (task.paradas?.length) {
      const first = task.paradas.find((p: OperatorParada) => p.clienteNombre?.trim());
      if (first?.clienteNombre) return first.clienteNombre;
    }
    if (task.ordenesTrabajo?.length) {
      const first = task.ordenesTrabajo.find((o: OperatorWorkOrder) => o.contrato?.clienteNombre?.trim());
      if (first?.contrato?.clienteNombre) return first.contrato.clienteNombre;
    }
    if (task.rutaPuntos?.length) {
      const first = task.rutaPuntos.find((pt: RoutePoint) => pt.clienteNombre?.trim());
      if (first?.clienteNombre) return first.clienteNombre;
    }
    return null;
  }

  getTaskComunidadDescription(task: OperatorRouteResponse): string {
    if (task.comunidadNombre?.trim()) return task.comunidadNombre;
    if (task.comunidadId != null) {
      const cached = this.comunidadesCatalog().get(task.comunidadId);
      if (cached?.trim()) return cached;
      return `Comunidad #${task.comunidadId}`;
    }
    return 'Comunidad Principal';
  }

  getTaskSectorDescription(task: OperatorRouteResponse): string {
    if (task.sectorNombre?.trim()) return task.sectorNombre;
    if (task.sectorId != null) {
      const cached = this.sectoresCatalog().get(task.sectorId);
      if (cached?.trim()) return cached;
      return `Sector #${task.sectorId}`;
    }
    return 'Sin Sector';
  }

  /**
   * Label del botón principal de cada ruta según tipoRuta.
   * Antes mostraba "Lecturas" universal — bug UX.
   */
  actionLabelFor(task: OperatorRouteResponse): string {
    const tipo = this.resolveTaskTipoRuta(task);
    switch (tipo) {
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

  actionIconFor(task: OperatorRouteResponse): string {
    const tipo = this.resolveTaskTipoRuta(task);
    switch (tipo) {
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
        if (
          st &&
          st !== 'PENDIENTE' &&
          st !== '__SIN_LECTURA__' &&
          st !== 'RECHAZADA_VERIFICACION'
        ) {
          readCount++;
        }
      }
    } else if (task.ordenesTrabajo?.length) {
      for (const o of task.ordenesTrabajo) {
        const serie =
          o.medidor?.serie ||
          (o.contrato?.numeroContrato
            ? String(o.contrato.numeroContrato)
            : `OT-${o.ordenTrabajoId}`);
        const st =
          statusMap.get(serie) ||
          statusMap.get(o.medidor?.serie ?? '') ||
          (o.contrato?.numeroGuia ? statusMap.get(String(o.contrato.numeroGuia)) : null) ||
          (o.contrato?.numeroContrato ? statusMap.get(String(o.contrato.numeroContrato)) : null) ||
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
    } else if (task.medidor) {
      const st = statusMap.get(task.medidor.serie);
      if (st && st !== 'PENDIENTE' && st !== '__SIN_LECTURA__' && st !== 'RECHAZADA_VERIFICACION') {
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
