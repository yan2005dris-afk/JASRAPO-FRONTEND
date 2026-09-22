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
import {
  classifyRouteLoadError,
  type OperatorRouteErrorInfo,
  OperatorRouteOfflineService,
} from '../service/operator-route-offline.service';
import { STATE_LABELS, FILTER_OPTIONS } from './rutas.constants';
import { compareRoutesCanonically, nextPendingWorkOrder } from './rutas.utils';
import {
  formatDistance as formatDistanceUtil,
  haversineMeters,
  type LatLng,
} from '../../../shared/utils/geo.utils';
import { RutasMapComponent, type MapPoint } from '../components/rutas-map/rutas-map.component';

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
  private readonly networkService = inject(NetworkService);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();

  // ── Signals ──────────────────────────────────────────────────────────────
  readonly tasks = signal<OperatorRouteResponse[]>([]);
  readonly activeFilter = signal<string>('ALL');
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

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly filteredTasks = computed<OperatorRouteResponse[]>(() => {
    const filter = this.activeFilter();
    const filtered =
      filter === 'ALL' ? this.tasks() : this.tasks().filter((t) => t.tipoRuta === filter);
    // Orden canónico de visita: el mismo que entrega GET /operator/routes
    // (comunidadId → sectorId → orden), aplicado igual en lista, caché offline y mapa.
    return filtered.slice().sort(compareRoutesCanonically);
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
      const meter = next.medidor;
      if (meter?.latitud == null || meter?.longitud == null) continue;
      distances.set(
        task.rutaId,
        haversineMeters(position, { lat: meter.latitud, lng: meter.longitud }),
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
  readonly filterOptions = FILTER_OPTIONS;
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
      const [routeResult] = await Promise.all([
        this.routeOfflineService.loadAssignedRoutes(),
        this.loadReadingStatuses(),
      ]);
      this.tasks.set(routeResult.routes);
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
      return task.paradas.filter((point) => point.latitud != null && point.longitud != null).length;
    }
    if (task.ordenesTrabajo?.length) {
      return task.ordenesTrabajo.filter(
        (order) => order.medidor?.latitud != null && order.medidor?.longitud != null,
      ).length;
    }
    if (task.rutaPuntos?.length) return task.rutaPuntos.length;
    return task.medidor?.latitud != null && task.medidor?.longitud != null ? 1 : 0;
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
}
