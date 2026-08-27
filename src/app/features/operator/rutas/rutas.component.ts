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
import type { TaskResponse } from '../models/operator.models';
import { OperatorRouteOfflineService } from '../service/operator-route-offline.service';
import { MARKER_COLORS, TIPO_ICONS, STATE_LABELS, FILTER_OPTIONS } from './rutas.constants';
import * as L from 'leaflet';

type ViewMode = 'list' | 'map';

interface MapPoint {
  routeId: string;
  lat: number;
  lng: number;
  estado: string;
  tipoRuta: string;
  popupHtml: string;
}

@Component({
  selector: 'app-rutas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouteTypePipe],
  templateUrl: './rutas.component.html',
  styleUrl: './rutas.component.scss',
})
export class RutasComponent implements OnInit, OnDestroy {
  private readonly routeOfflineService = inject(OperatorRouteOfflineService);
  private readonly dbService = inject(IndexedDbService);
  private readonly networkService = inject(NetworkService);
  private readonly router = inject(Router);

  private map?: L.Map;
  private markersGroup?: L.LayerGroup;
  private userMarker?: L.Marker;
  private geoWatchId?: number;
  /** Contador de tileerrors consecutivos para evitar degradar el mapa por un blip. */
  private consecutiveTileErrors = 0;
  /** Subject para desuscribir observables en ngOnDestroy. */
  private readonly destroy$ = new Subject<void>();

  // ── Signals ──────────────────────────────────────────────────────────────
  readonly tasks = signal<TaskResponse[]>([]);
  readonly activeFilter = signal<string>('ALL');
  readonly viewMode = signal<ViewMode>('list');
  readonly isLoading = signal<boolean>(false);
  readonly selectedTaskId = signal<string | null>(null);
  readonly readingStatusBySerie = signal<Map<string, string>>(new Map());
  readonly routesSource = signal<'network' | 'cache' | null>(null);
  readonly routesCachedAt = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly tileLayerUnavailable = signal<boolean>(false);
  readonly isDegradedMap = computed(
    () => !this.networkService.isOnline() || this.tileLayerUnavailable(),
  );

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly filteredTasks = computed<TaskResponse[]>(() => {
    const filter = this.activeFilter();
    return filter === 'ALL' ? this.tasks() : this.tasks().filter((t) => t.tipoRuta === filter);
  });

  readonly mapPoints = computed<MapPoint[]>(() => {
    const activeSelectedId = this.selectedTaskId();
    const statusMap = this.readingStatusBySerie();

    const sortedTasks = this.filteredTasks()
      .slice()
      .sort((a, b) => a.orden - b.orden);

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
    this.destroyMap();
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
      if (this.viewMode() === 'map') this.initMap();
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
    if (this.viewMode() === 'map') setTimeout(() => this.initMap(), 0);
  }

  toggleView(): void {
    const newMode = this.viewMode() === 'list' ? 'map' : 'list';
    this.viewMode.set(newMode);
    if (newMode === 'map') {
      setTimeout(() => this.initMap(), 0);
    } else {
      this.selectedTaskId.set(null);
      this.destroyMap();
    }
  }

  selectTask(taskId: string | null): void {
    this.selectedTaskId.set(taskId);
    if (this.viewMode() === 'map') this.initMap();
  }

  viewOnMap(task: TaskResponse): void {
    this.selectedTaskId.set(task.rutaId);
    this.viewMode.set('map');
    setTimeout(() => this.initMap(), 0);
  }

  /**
   * Navega a la pantalla de lecturas filtrando por los medidores de esta ruta.
   * Usa click simple (compatible con táctil y escritorio).
   */
  openRoute(task: TaskResponse): void {
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
    } else if (ordenes && ordenes.length > 0) {
      queryParams['series'] = ordenes
        .map((ord) => ord.medidor?.serie)
        .filter((s): s is string => !!s)
        .join(',');
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

  taskHasMapPoints(task: TaskResponse): boolean {
    return this.getTaskPointCount(task) > 0;
  }

  taskHasMeterCoordinates(task: TaskResponse): boolean {
    return Number.isFinite(task.medidor?.latitud) && Number.isFinite(task.medidor?.longitud);
  }

  getTaskPointCount(task: TaskResponse): number {
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

  // ── Mapa Leaflet ──────────────────────────────────────────────────────────

  private initMap(): void {
    this.destroyMap();
    this.tileLayerUnavailable.set(false);

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const points = this.mapPoints();
    const center: L.LatLngExpression = points[0]
      ? [points[0].lat, points[0].lng]
      : [-0.9677, -80.7089];

    this.map = L.map('map').setView(center, 14);

    if (this.networkService.isOnline()) {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      })
        .on('tileerror', () => {
          // Un solo tile con timeout no debe degradar el mapa para toda la sesión.
          // Marcamos degradado solo después de N fallos consecutivos y nos recuperamos
          // ante el primer tileload.
          this.consecutiveTileErrors += 1;
          if (this.consecutiveTileErrors >= 5) {
            this.tileLayerUnavailable.set(true);
          }
        })
        .on('tileload', () => {
          this.consecutiveTileErrors = 0;
          if (this.networkService.isOnline()) {
            this.tileLayerUnavailable.set(false);
          }
        })
        .addTo(this.map);
    }

    this.markersGroup = L.layerGroup().addTo(this.map);

    const routeLines = new Map<string, L.LatLngTuple[]>();
    for (const point of points) {
      const line = routeLines.get(point.routeId) ?? [];
      line.push([point.lat, point.lng]);
      routeLines.set(point.routeId, line);
    }
    for (const line of routeLines.values()) {
      if (line.length < 2) continue;
      L.polyline(line, {
        color: '#0f7375',
        weight: 4,
        opacity: 0.8,
        dashArray: this.isDegradedMap() ? '8 8' : undefined,
      }).addTo(this.markersGroup);
    }

    points.forEach((point) => {
      const color = MARKER_COLORS[point.estado] ?? '#9ca3af';
      const iconClass = TIPO_ICONS[point.tipoRuta] ?? 'bi-geo-alt-fill';
      const icon = L.divIcon({
        html: `<div class="map-type-marker" style="background:${color}"><i class="bi ${iconClass}"></i></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
      });

      L.marker([point.lat, point.lng], { icon })
        .bindPopup(point.popupHtml)
        .addTo(this.markersGroup!);
    });

    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngTuple));
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }

    this.startGeoWatch();
  }

  private startGeoWatch(): void {
    if (!navigator.geolocation) return;
    this.geoWatchId = navigator.geolocation.watchPosition(
      (pos) => this.updateUserMarker(pos.coords.latitude, pos.coords.longitude),
      () => {
        /* permiso denegado o error GPS — silencioso */
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }

  private updateUserMarker(lat: number, lng: number): void {
    if (!this.map) return;
    const icon = L.divIcon({
      html: `<div class="map-user-marker"><i class="bi bi-person-fill"></i></div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lng]);
    } else {
      this.userMarker = L.marker([lat, lng], { icon }).addTo(this.map);
    }
  }

  centerOnUser(): void {
    if (this.userMarker && this.map) {
      this.map.setView(this.userMarker.getLatLng(), 16);
    }
  }

  private destroyMap(): void {
    if (this.geoWatchId !== undefined) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = undefined;
    }
    this.userMarker = undefined;
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.markersGroup = undefined;
    }
  }
}
