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
import type { OperatorRouteResponse, RouteType } from '../models/operator.models';
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
  readonly comunidadesCatalog = signal<Map<number, string>>(new Map());
  readonly sectoresCatalog = signal<Map<number, string>>(new Map());
  readonly activeFilter = signal<string>('ALL');
  readonly activeStateFilter = signal<string>('ALL');
  readonly activeComunidadFilter = signal<string>('ALL');
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
        count += t.ordenesTrabajo?.length || 1;
      }
    }
    return count > 0 ? count : 4;
  });

  readonly heroActiveRoute = computed<OperatorRouteResponse | null>(() => {
    const all = this.tasks();
    return all.find((t) => t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA') ?? all[0] ?? null;
  });

  // ── Computed ─────────────────────────────────────────────────────────────
  // ── Comunidades & Sectores Computados Separados ───────────────────────────
  readonly availableComunidades = computed<{ id: string; label: string }[]>(() => {
    const map = new Map<string, string>();
    const comCatalog = this.comunidadesCatalog();
    for (const t of this.tasks()) {
      if (t.comunidadId != null) {
        const id = String(t.comunidadId);
        const label =
          t.comunidadNombre?.trim() || comCatalog.get(t.comunidadId) || `Comunidad #${id}`;
        map.set(id, label);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  });

  readonly availableSectors = computed<{ id: string; label: string }[]>(() => {
    const map = new Map<string, string>();
    const secCatalog = this.sectoresCatalog();
    for (const t of this.tasks()) {
      if (t.sectorNombre?.trim()) {
        map.set(t.sectorNombre.trim(), t.sectorNombre.trim());
      } else if (t.sectorId != null) {
        const id = String(t.sectorId);
        const label = secCatalog.get(t.sectorId) || `Sector #${id}`;
        map.set(label, label);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  });

  readonly filteredTasks = computed<OperatorRouteResponse[]>(() => {
    const tipo = this.activeFilter();
    const estado = this.activeStateFilter();
    const comunidad = this.activeComunidadFilter();
    const sector = this.activeSectorFilter();
    const secCatalog = this.sectoresCatalog();

    return this.tasks().filter((t) => {
      if (tipo !== 'ALL' && t.tipoRuta !== tipo) return false;
      if (estado !== 'ALL' && t.estado !== estado) return false;
      if (comunidad !== 'ALL' && String(t.comunidadId) !== comunidad) return false;
      if (sector !== 'ALL') {
        const secNombre = t.sectorNombre?.trim();
        const secDesc = t.descripcion?.trim();
        const secId = t.sectorId != null ? String(t.sectorId) : null;
        const cachedSec = t.sectorId != null ? secCatalog.get(t.sectorId) : null;
        if (
          secNombre !== sector &&
          secDesc !== sector &&
          secId !== sector &&
          cachedSec !== sector &&
          `Sector #${t.sectorId}` !== sector
        ) {
          return false;
        }
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
      const [routeResult, comCache, secCache] = await Promise.all([
        this.routeOfflineService.loadAssignedRoutes(),
        this.dbService.getComunidadesCache().catch(() => []),
        this.dbService.getSectoresCache().catch(() => []),
        this.loadReadingStatuses(),
      ]);
      const comMap = new Map<number, string>(comCache.map((c) => [c.comunidadId, c.nombre]));
      const secMap = new Map<number, string>(secCache.map((s) => [s.sectorId, s.nombre]));

      // Auto-cosechar comunidades y sectores nuevos provenientes de la respuesta del backend
      const newComunidades: { comunidadId: number; nombre: string }[] = [];
      const newSectores: { sectorId: number; comunidadId?: number; nombre: string }[] = [];

      for (const r of routeResult.routes || []) {
        if (
          r.comunidadId != null &&
          r.comunidadNombre?.trim() &&
          !comMap.has(Number(r.comunidadId))
        ) {
          comMap.set(Number(r.comunidadId), r.comunidadNombre.trim());
          newComunidades.push({
            comunidadId: Number(r.comunidadId),
            nombre: r.comunidadNombre.trim(),
          });
        }
        if (r.sectorId != null && r.sectorNombre?.trim() && !secMap.has(Number(r.sectorId))) {
          secMap.set(Number(r.sectorId), r.sectorNombre.trim());
          newSectores.push({
            sectorId: Number(r.sectorId),
            comunidadId: r.comunidadId != null ? Number(r.comunidadId) : undefined,
            nombre: r.sectorNombre.trim(),
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
          const comunidadNombre =
            r.comunidadNombre?.trim() || (comId ? comMap.get(comId) : undefined);
          const sectorNombre = r.sectorNombre?.trim() || (secId ? secMap.get(secId) : undefined);
          return {
            ...r,
            rutaId: String(r.rutaId || idx + 1),
            tipoRuta: r.tipoRuta || 'TOMA_LECTURA',
            estado: r.estado || 'PENDIENTE',
            nombre: r.nombre || `Ruta ${r.tipoRuta || 'TOMA_LECTURA'} #${idx + 1}`,
            comunidadNombre,
            sectorNombre,
            paradas: Array.isArray(r.paradas) ? r.paradas : [],
            ordenesTrabajo: Array.isArray(r.ordenesTrabajo) ? r.ordenesTrabajo : [],
          };
        },
      );
      this.tasks.set(normalizedRoutes);
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

  setComunidadFilter(comunidad: string): void {
    this.activeComunidadFilter.set(comunidad);
    this.selectedTaskId.set(null);
  }

  setSectorFilter(sector: string): void {
    this.activeSectorFilter.set(sector);
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
    return 'TOMA_LECTURA';
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
        const actTipo = ord.tipoActividad || (ord as any).ruta?.tipoActividad?.codigo || tipoRuta;
        if (actTipo && ord.ordenTrabajoId) {
          workOrderEntries.push(`${id}:${actTipo}:${ord.ordenTrabajoId}:${ord.estado || 'PENDIENTE'}`);
        }
      }
    } else if (paradas.length > 0) {
      for (const p of paradas) {
        const id = p.serie || `OT-${p.ordenTrabajoId}`;
        orderIdentifiers.push(id);
        const actTipo = p.tipoActividad || tipoRuta;
        if (actTipo && p.ordenTrabajoId) {
          workOrderEntries.push(`${id}:${actTipo}:${p.ordenTrabajoId}:${p.estado || 'PENDIENTE'}`);
        }
      }
    } else if (tipoRuta === 'TOMA_LECTURA' && task.rutaPuntos?.length) {
      orderIdentifiers.push(...task.rutaPuntos.map((pt) => pt.serie));
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
        const [id, tipo, ordenTrabajoId, estado] = wo.split(':');
        const assignments = grouped.get(id) ?? [];
        assignments.push(`${tipo}:${ordenTrabajoId}:${estado}`);
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

  getTaskComunidadDescription(task: OperatorRouteResponse): string {
    if (task.comunidadNombre?.trim()) return task.comunidadNombre.trim();
    if (task.comunidadId != null) {
      const cached = this.comunidadesCatalog().get(task.comunidadId);
      if (cached) return cached;
      return `Comunidad #${task.comunidadId}`;
    }
    return 'Comunidad Principal';
  }

  getTaskSectorDescription(task: OperatorRouteResponse): string {
    if (task.sectorNombre?.trim()) return task.sectorNombre.trim();
    if (task.sectorId != null) {
      const cached = this.sectoresCatalog().get(task.sectorId);
      if (cached) return cached;
      return `Sector #${task.sectorId}`;
    }
    return 'Toda la comunidad';
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
