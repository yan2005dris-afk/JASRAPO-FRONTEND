import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { AuthService } from '../../../core/services/auth.service';
import { MeterCacheService } from '../../../core/services/meter-cache.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IMeterDto } from '../../contracts/meters/domain/models/meter.model';
import { MeterSearchComponent } from '../components/meter-search/meter-search.component';
import { SelectedMeterCardComponent } from '../components/selected-meter-card/selected-meter-card.component';
import { RouteTypePipe } from '../../../shared/pipes/route-type.pipe';
import {
  EstadoInfo,
  EstadoChip,
  MeterGroup,
  MobileStep,
  LecturaState,
  READING_STATE_ORDER,
  ESTADOS_FALLBACK,
} from './readings.models';
import { WorkOrderDispatcherComponent } from '../components/work-order-dispatcher/work-order-dispatcher.component';
import { calculateConsumo, type WorkOrderFormPayload } from '../models/work-order-form.models';
import type {
  WorkOrderActivityType,
  WorkOrderState,
  OperatorRouteResponse,
} from '../models/operator.models';

interface AssignedWorkOrder {
  id: string;
  estado: WorkOrderState;
  lecturaId?: string;
}

interface SubmissionFeedback {
  kind: 'error' | 'queued' | 'synced';
  title: string;
  message: string;
}

interface ReadingRecord {
  lecturaId?: string;
  _lecturaId?: string;
  medidorId?: string | number;
  medidor?: { medidorId?: string | number; serie?: string };
  lecturaActual?: number;
  lecturaAnterior?: number;
  estado?: string;
  syncState?: string;
  contratoId?: string | number;
  [key: string]: unknown;
}

import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-operator-readings',
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule,
    MeterSearchComponent,
    SelectedMeterCardComponent,
    RouteTypePipe,
    WorkOrderDispatcherComponent,
  ],
  templateUrl: './lecturas.component.html',
  styleUrl: './lecturas.component.scss',
})
export class LecturasComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly dbService = inject(IndexedDbService);
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);
  private readonly authService = inject(AuthService);
  private readonly meterCache = inject(MeterCacheService);
  private readonly toastService = inject(ToastService);
  // State Machine única con estado discriminado
  readonly state = signal<LecturaState>({ kind: 'search' });

  // Selectores derivados para compatibilidad y template
  readonly currentStep = computed<MobileStep>(() => this.state().kind);
  readonly selectedMeter = computed<IMeterDto | null>(() => {
    const s = this.state();
    return s.kind === 'search' ? null : s.meter;
  });
  readonly activeTipoActividad = computed<WorkOrderActivityType>(() => {
    const s = this.state();
    return s.kind === 'form' ? s.tipo : 'LECTURA';
  });

  /** Tipos de orden pendientes por medidor (un medidor puede tener varios). */
  private readonly workOrdersByMeter = signal<
    Map<string, Map<WorkOrderActivityType, AssignedWorkOrder>>
  >(new Map());

  // Catálogo de medidores cargado (memoria local)
  readonly metersList = this.meterCache.metersList;
  readonly routeSyntheticMeters = signal<IMeterDto[]>([]);

  readonly combinedMetersList = computed<IMeterDto[]>(() => {
    const cached = this.metersList();
    const synthetics = this.routeSyntheticMeters();
    if (!synthetics.length) return cached;
    const cachedSeries = new Set(cached.map((m) => m.serie));
    const toAdd = synthetics.filter((s) => !cachedSeries.has(s.serie));
    return [...cached, ...toAdd];
  });

  readonly searchQuery = signal<string>('');
  readonly isLoadingMeters = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly submissionFeedback = signal<SubmissionFeedback | null>(null);
  private readonly failedSubmission = signal<WorkOrderFormPayload | null>(null);

  // Lecturas registradas en el período activo (memoria local/caché)
  readonly registeredReadings = signal<ReadingRecord[]>([]);
  readonly pendingReadings = signal<ReadingRecord[]>([]);
  readonly syncedReadings = signal<ReadingRecord[]>([]);

  // IDs de medidores con lecturas en estado no editable por el operador (POR_REVISION, APROBADA, etc.)
  // Mapa medidorId, serie, contratoId y OT -> lectura existente
  // Prioridad: 1) syncedReadings (recibo local histórico), 2) registeredReadings (autoritativo servidor), 3) pendingReadings (cola local sin sincronizar)
  readonly existingReadingMap = computed<Map<string, ReadingRecord>>(() => {
    const map = new Map<string, ReadingRecord>();

    // 1. Recibos locales previamente sincronizados
    for (const s of this.syncedReadings()) {
      const mId =
        s['medidorId'] ?? (s['medidor'] as { medidorId?: string | number } | undefined)?.medidorId;
      const record = {
        ...s,
        estado: (s['estado'] as string) || 'POR_REVISION',
      };
      if (mId != null) {
        map.set(mId.toString(), record as ReadingRecord);
      }
      if (s['medidorSerie'] || s['serie']) {
        map.set(String(s['medidorSerie'] || s['serie']), record as ReadingRecord);
      }
      if (s['contratoId']) {
        map.set(String(s['contratoId']), record as ReadingRecord);
      }
      if (s['ordenTrabajoId']) {
        map.set(String(s['ordenTrabajoId']), record as ReadingRecord);
        map.set(`OT-${s['ordenTrabajoId']}`, record as ReadingRecord);
      }
    }

    // 2. Registradas del servidor (autoridad de estados: APROBADA, RECHAZADA_VERIFICACION, etc.)
    for (const r of this.registeredReadings()) {
      const mId = r.medidor?.medidorId ?? r.medidorId;
      const prev = mId != null ? map.get(mId.toString()) : undefined;
      const merged = { ...prev, ...r } as ReadingRecord;
      if (mId != null) map.set(mId.toString(), merged);
      if (r.medidor?.serie) map.set(r.medidor.serie, merged);
      if (r.contratoId) map.set(r.contratoId.toString(), merged);
    }

    // 3. Pendientes locales por sincronizar (cambios recién efectuados offline)
    for (const p of this.pendingReadings()) {
      const mId = p['medidorId'];
      const record = {
        ...(mId != null ? map.get(mId.toString()) : undefined),
        ...p,
        estado: (p['estado'] as string) || 'POR_REVISION',
      };
      if (mId != null) {
        map.set(mId.toString(), record as ReadingRecord);
      }
      if (p['medidorSerie'] || p['serie']) {
        map.set(String(p['medidorSerie'] || p['serie']), record as ReadingRecord);
      }
      if (p['contratoId']) {
        map.set(String(p['contratoId']), record as ReadingRecord);
      }
      if (p['ordenTrabajoId']) {
        map.set(String(p['ordenTrabajoId']), record as ReadingRecord);
        map.set(`OT-${p['ordenTrabajoId']}`, record as ReadingRecord);
      }
    }
    return map;
  });

  // IDs de medidores con lectura efectiva procesada (excluye PENDIENTE y RECHAZADA_VERIFICACION)
  readonly readMetersIds = computed<Set<string>>(() => {
    const ids = new Set<string>();
    const map = this.existingReadingMap();
    for (const [key, record] of map.entries()) {
      if (
        record.estado &&
        record.estado !== 'PENDIENTE' &&
        record.estado !== 'RECHAZADA_VERIFICACION'
      ) {
        ids.add(key);
      }
    }
    return ids;
  });

  // ========== ESTADO FILTERS & GROUPING ==========

  // Catálogo de estados cargado desde el backend (fallback hardcoded offline)
  readonly estadosCatalog = signal<EstadoInfo[]>([]);

  // Chips de filtro por estado
  readonly estadoFilterChips = computed<EstadoChip[]>(() => {
    const chips: EstadoChip[] = [{ value: 'todas', label: 'Todas', icon: 'bi-funnel' }];
    for (const e of this.estadosCatalog()) {
      chips.push({ value: e.codigo, label: e.nombre, icon: e.icono });
    }
    return chips;
  });

  // Filtro de estado activo
  readonly selectedEstadoFilter = signal<string>('todas');

  // Medidores agrupados por estado de lectura
  readonly metersByEstado = computed<MeterGroup[]>(() => {
    const meters = this.filteredMeters();
    const filter = this.selectedEstadoFilter();
    const readingMap = this.existingReadingMap();
    const estadoInfo = new Map<string, { label: string; icon: string }>();
    for (const e of this.estadosCatalog()) {
      estadoInfo.set(e.codigo, { label: e.nombre, icon: e.icono });
    }

    const groups = new Map<string, IMeterDto[]>();

    for (const meter of meters) {
      const existing = readingMap.get(meter.medidorId.toString());
      // La lista se filtra y etiqueta por estado de lectura. El estado de la orden
      // se muestra por separado en el paso de acciones.
      const estado = existing?.estado ?? '__SIN_LECTURA__';

      if (filter !== 'todas' && estado !== filter) continue;

      if (!groups.has(estado)) groups.set(estado, []);
      groups.get(estado)!.push(meter);
    }

    // Orden consistente importado desde readings.models.ts
    return READING_STATE_ORDER.filter((key) => groups.has(key)).map((key) => {
      const isSinLectura = key === '__SIN_LECTURA__';
      const isWorkOrderRoute = this.routeContext() && this.routeContext()?.tipo !== 'LECTURA';
      const info = isSinLectura
        ? {
            label: isWorkOrderRoute ? 'Pendiente' : 'Sin Lectura',
            icon: isWorkOrderRoute ? 'bi-clipboard-check' : 'bi-clock',
            cssClass: null as string | null,
          }
        : {
            label: estadoInfo.get(key)?.label ?? key,
            icon: estadoInfo.get(key)?.icon ?? 'bi-question',
            cssClass: `badge-${key.toLowerCase().replace(/_/g, '-')}` as string | null,
          };
      return { estado: key, info, meters: groups.get(key)! };
    });
  });

  /** Lista aplanada de medidores con su estado para el viewport de Virtual Scrolling */
  readonly virtualMeterItems = computed<
    { meter: IMeterDto; status: { label: string; icon: string; cssClass: string | null } }[]
  >(() => {
    const items: {
      meter: IMeterDto;
      status: { label: string; icon: string; cssClass: string | null };
    }[] = [];
    for (const group of this.metersByEstado()) {
      for (const meter of group.meters) {
        items.push({ meter, status: group.info });
      }
    }
    return items;
  });

  // When navigated from a route: restricts list to those series only
  readonly allowedSeries = signal<Set<string> | null>(null);
  readonly routeContext = signal<{ nombre: string; tipo: string } | null>(null);

  // Lectura anterior pre-cargada para el formulario de Lectura
  readonly lecturaAnteriorPreloaded = signal<number>(0);

  readonly filteredMeters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const allowed = this.allowedSeries();
    let list = this.combinedMetersList();

    if (allowed !== null) {
      list = list.filter((m) => allowed.has(m.serie));
    }

    if (!query) return list;
    return list.filter(
      (m) =>
        m.serie.toLowerCase().includes(query) ||
        (m.contratoId && m.contratoId.toString().toLowerCase().includes(query)) ||
        (m.clienteNombre && m.clienteNombre.toLowerCase().includes(query)) ||
        (m.marca && m.marca.toLowerCase().includes(query)),
    );
  });

  // Segmented control de órdenes para el flujo de ruta
  readonly orderFilter = signal<'TODAS' | 'PENDIENTES' | 'COMPLETADAS'>('TODAS');
  readonly completedWorkOrderIds = signal<Set<string>>(new Set());

  getOrderRecord(meter: IMeterDto): ReadingRecord | undefined {
    const map = this.existingReadingMap();
    return (
      map.get(meter.medidorId.toString()) ||
      map.get(meter.serie) ||
      (meter.contratoId ? map.get(meter.contratoId.toString()) : undefined)
    );
  }

  isOrderCompleted(meter: IMeterDto): boolean {
    const existing = this.getOrderRecord(meter);
    if (existing) {
      if (existing.estado === 'RECHAZADA_VERIFICACION' || existing.estado === 'PENDIENTE') {
        return false;
      }
      return true;
    }
    if (this.completedWorkOrderIds().has(meter.medidorId.toString())) return true;
    if (this.completedWorkOrderIds().has(meter.serie)) return true;
    if (this.readMetersIds().has(meter.medidorId.toString())) return true;
    if (this.readMetersIds().has(meter.serie)) return true;
    return false;
  }

  getOrderStatusInfo(meter: IMeterDto): { label: string; cssClass: string; icon: string } {
    const record = this.getOrderRecord(meter);
    const estado = record?.estado;

    if (!estado || estado === 'PENDIENTE') {
      const isDone =
        this.completedWorkOrderIds().has(meter.medidorId.toString()) ||
        this.completedWorkOrderIds().has(meter.serie) ||
        this.readMetersIds().has(meter.medidorId.toString()) ||
        this.readMetersIds().has(meter.serie);
      if (isDone) {
        return { label: 'Completada', cssClass: 'badge-completada', icon: 'bi-check-circle-fill' };
      }
      return { label: 'Pendiente', cssClass: 'badge-pendiente', icon: 'bi-clock' };
    }

    switch (estado) {
      case 'POR_REVISION':
        return { label: 'Por Revisión', cssClass: 'badge-por-revision', icon: 'bi-clock-history' };
      case 'APROBADA':
        return { label: 'Aprobada', cssClass: 'badge-aprobada', icon: 'bi-check2-circle' };
      case 'COMPLETADA':
        return { label: 'Completada', cssClass: 'badge-completada', icon: 'bi-check-circle-fill' };
      case 'RECHAZADA_VERIFICACION':
        return {
          label: 'Por Verificar',
          cssClass: 'badge-rechazada-verificacion',
          icon: 'bi-arrow-repeat',
        };
      case 'ANOMALIA':
        return {
          label: 'Con Novedad',
          cssClass: 'badge-anomalia',
          icon: 'bi-exclamation-triangle-fill',
        };
      default: {
        const found = this.estadosCatalog().find((e) => e.codigo === estado);
        return {
          label: found?.nombre || estado,
          cssClass: `badge-${estado.toLowerCase().replace(/_/g, '-')}`,
          icon: found?.icono || 'bi-info-circle-fill',
        };
      }
    }
  }

  readonly orderCounts = computed(() => {
    const list = this.filteredMeters();
    const total = list.length;
    let completed = 0;
    for (const m of list) {
      if (this.isOrderCompleted(m)) {
        completed++;
      }
    }
    const pending = Math.max(0, total - completed);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, completed, pct };
  });

  readonly segmentedOrders = computed(() => {
    const list = this.filteredMeters();
    const filter = this.orderFilter();
    return list.filter((m) => {
      const done = this.isOrderCompleted(m);
      if (filter === 'PENDIENTES') return !done;
      if (filter === 'COMPLETADAS') return done;
      return true;
    });
  });

  openOrderExecution(meter: IMeterDto): void {
    this.selectMeter(meter);
    const primary = this.primaryWorkOrderFor(meter);
    const tipo = primary
      ? primary[0]
      : (meter.marca as WorkOrderActivityType) ||
        (this.routeContext()?.tipo as WorkOrderActivityType) ||
        'LECTURA';
    this.goToWorkOrderForm(tipo);
  }

  goBackToRoutes(): void {
    this.router.navigate(['/app/operador/rutas']);
  }

  ngOnInit(): void {
    this.autoSelectFromQueryParam();
    this.loadCachedMeters();
    this.loadPendingReadings();
    this.loadEstadosCatalog();
  }

  private async loadCachedMeters(): Promise<void> {
    try {
      await this.meterCache.load();
      const operatorId = this.authService.currentUser()?.id;
      const scope = operatorId ? `operator:${operatorId}` : undefined;
      const [initialCachedReadings, assignedWorkOrders] = await Promise.all([
        this.dbService.getRegisteredReadingsCache(scope),
        this.dbService.getAssignedWorkOrders(scope),
      ]);
      this.mergeAssignedWorkOrders(assignedWorkOrders);
      let cachedReadings = initialCachedReadings;
      this.registeredReadings.set(cachedReadings ?? []);

      if (this.networkService.isOnline()) {
        try {
          const readings = (await this.syncService.getCurrentPeriodReadings()) as ReadingRecord[];
          if (readings?.length) {
            await this.dbService.saveRegisteredReadingsCache(readings, scope);
            cachedReadings = readings;
            this.registeredReadings.set(readings);
          }
        } catch {
          // Ignorar fallas silenciosas en prefetch de fondo
        }
      }

      // Si se pasó una serie específica fuera del flujo de ruta y no estaba seleccionada
      const singleSerie = this.activatedRoute.snapshot.queryParamMap.get('serie');
      if (!this.routeContext() && singleSerie && !this.selectedMeter()) {
        const meter = this.combinedMetersList().find((m) => m.serie === singleSerie);
        if (meter) this.selectMeter(meter);
      }
    } catch (e) {
      console.error('Error al cargar caché offline:', e);
    }
  }

  private mergeAssignedWorkOrders(workOrders: Record<string, unknown>[]): void {
    const merged = new Map(this.workOrdersByMeter());
    const meterSeriesById = new Map(
      this.metersList().map((meter) => [String(meter.medidorId), meter.serie]),
    );

    for (const workOrder of workOrders) {
      const meter = workOrder['medidor'] as { medidorId?: unknown; serie?: unknown } | undefined;
      const medidorId = workOrder['medidorId'] ?? meter?.medidorId;
      const serie =
        typeof meter?.serie === 'string'
          ? meter.serie
          : medidorId != null
            ? meterSeriesById.get(String(medidorId))
            : undefined;
      const id = workOrder['ordenTrabajoId'] ?? workOrder['id'];
      const tipo = workOrder['tipoActividad'] as WorkOrderActivityType | undefined;
      const estado = workOrder['estado'] as WorkOrderState | undefined;
      if (!serie || id == null || !tipo || !estado) continue;

      const assignments = new Map(merged.get(serie) ?? []);
      if (!assignments.has(tipo)) assignments.set(tipo, { id: String(id), estado });
      merged.set(serie, assignments);
    }

    this.workOrdersByMeter.set(merged);
  }

  private autoSelectFromQueryParam(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    const rutaId = params.get('rutaId');
    const rutaNombre = params.get('rutaNombre');
    const rutaTipo = params.get('rutaTipo');
    const seriesParam = params.get('series');
    const singleSerie = params.get('serie');
    const workOrdersParam = params.get('workOrders');

    if (rutaNombre && rutaTipo) {
      this.routeContext.set({ nombre: rutaNombre, tipo: rutaTipo });
    }

    // Recuperar datos de la ruta (desde router state o sessionStorage)
    let activeRoute: OperatorRouteResponse | null = null;
    if (history.state && history.state.route) {
      activeRoute = history.state.route as OperatorRouteResponse;
    } else {
      try {
        const stored = sessionStorage.getItem('activeOperatorRoute');
        if (stored) activeRoute = JSON.parse(stored);
      } catch {
        // ignore
      }
    }

    const synthetics: IMeterDto[] = [];
    if (
      activeRoute &&
      (!rutaId ||
        String(activeRoute.rutaId) === String(rutaId) ||
        activeRoute.nombre === rutaNombre)
    ) {
      if (activeRoute.ordenesTrabajo?.length) {
        for (const wo of activeRoute.ordenesTrabajo) {
          const id = wo.medidor?.serie || wo.contrato?.numeroContrato || `OT-${wo.ordenTrabajoId}`;
          const realMedidorId =
            wo.medidor?.medidorId != null && Number(wo.medidor.medidorId) > 0
              ? Number(wo.medidor.medidorId)
              : Number(wo.ordenTrabajoId)
                ? -Math.abs(Number(wo.ordenTrabajoId))
                : -1;
          synthetics.push({
            medidorId: realMedidorId,
            serie: id,
            marca: wo.tipoActividad,
            modelo: wo.contrato?.direccion || '',
            clienteNombre: wo.contrato?.clienteNombre || 'Cliente sin nombre',
            contratoId: wo.contrato?.numeroContrato || wo.contratoId || null,
            fechaInstalacion: null,
          });
        }
      } else if (activeRoute.paradas?.length) {
        for (const p of activeRoute.paradas) {
          const id = p.serie || p.clienteNombre || `OT-${p.ordenTrabajoId}`;
          synthetics.push({
            medidorId: Number(p.ordenTrabajoId) ? -Math.abs(Number(p.ordenTrabajoId)) : -1,
            serie: id,
            marca: p.tipoActividad,
            modelo: p.direccionSuministro || '',
            clienteNombre: p.clienteNombre || 'Cliente sin nombre',
            contratoId: null,
            fechaInstalacion: null,
          });
        }
      }
    }

    if (synthetics.length > 0) {
      this.routeSyntheticMeters.set(synthetics);
    }

    // Build a lookup map: serie → activity type → assigned work-order ID.
    // Format: "SERIE1:INSTALACION:ORDER_ID:ESTADO;INSPECCION:OTHER_ID:ESTADO".
    // Legacy assignments without estado default to PENDIENTE.
    if (activeRoute && !this.routeContext()) {
      this.routeContext.set({ nombre: activeRoute.nombre, tipo: activeRoute.tipoRuta });
    }

    if (workOrdersParam) {
      const workOrdersByMeter = new Map<string, Map<WorkOrderActivityType, AssignedWorkOrder>>();
      for (const entry of workOrdersParam.split(',')) {
        const [serie, assignmentsCsv] = entry.split(/:(.*)/s);
        if (!serie || !assignmentsCsv) continue;
        const assignments = new Map<WorkOrderActivityType, AssignedWorkOrder>();
        for (const assignment of assignmentsCsv.split(';')) {
          const [tipo, ordenTrabajoId = '', estado = 'PENDIENTE', lecturaId = ''] =
            assignment.split(':');
          const t = tipo.trim() as WorkOrderActivityType;
          const workOrderState = estado.trim() as WorkOrderState;
          if (t && ordenTrabajoId.trim()) {
            assignments.set(t, {
              id: ordenTrabajoId.trim(),
              estado: workOrderState,
              ...(lecturaId.trim() ? { lecturaId: lecturaId.trim() } : {}),
            });
          }
        }
        if (assignments.size) workOrdersByMeter.set(serie.trim(), assignments);
      }
      this.workOrdersByMeter.set(workOrdersByMeter);
    } else if (activeRoute?.ordenesTrabajo?.length) {
      const workOrdersByMeter = new Map<string, Map<WorkOrderActivityType, AssignedWorkOrder>>();
      for (const wo of activeRoute.ordenesTrabajo) {
        const id = wo.medidor?.serie || wo.contrato?.numeroContrato || `OT-${wo.ordenTrabajoId}`;
        const assignments = new Map<WorkOrderActivityType, AssignedWorkOrder>();
        const routeRef = (wo as unknown as Record<string, unknown>)['ruta'] as
          { tipoActividad?: { codigo?: string } } | undefined;
        const tipo =
          (wo.tipoActividad as WorkOrderActivityType) ||
          (routeRef?.tipoActividad?.codigo as WorkOrderActivityType) ||
          (activeRoute.tipoRuta as WorkOrderActivityType) ||
          'LECTURA';
        assignments.set(tipo, {
          id: String(wo.ordenTrabajoId),
          estado: (wo.estado as WorkOrderState) || 'PENDIENTE',
          lecturaId: wo.lecturaId ? String(wo.lecturaId) : undefined,
        });
        workOrdersByMeter.set(id, assignments);
      }
      this.workOrdersByMeter.set(workOrdersByMeter);
    }

    if (seriesParam) {
      const set = new Set(
        seriesParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
      if (set.size > 0) {
        this.allowedSeries.set(set);
      }
    }

    // Solo auto-seleccionar si NO estamos en el flujo de órdenes de una ruta
    if (!this.routeContext() && singleSerie && !this.selectedMeter()) {
      const meter = this.combinedMetersList().find((m) => m.serie === singleSerie);
      if (meter) this.selectMeter(meter);
    }
  }

  /**
   * Carga las lecturas pendientes y sincronizadas del caché IndexedDB
   */
  private async loadPendingReadings(): Promise<void> {
    try {
      const [pending, synced] = await Promise.all([
        this.dbService.getPendingReadings().catch(() => []),
        this.dbService.getSyncedReadings().catch(() => []),
      ]);
      this.pendingReadings.set(pending);
      this.syncedReadings.set(synced);
    } catch (e) {
      console.error('Error al cargar lecturas locales:', e);
    }
  }

  /**
   * Carga el catálogo de estados desde el backend. Si falla (offline), usa fallback hardcoded.
   */
  private async loadEstadosCatalog(): Promise<void> {
    try {
      if (this.networkService.isOnline()) {
        const estados = await this.syncService.getReadingEstados();
        // Mapear response a EstadoInfo (codigo, nombre, orden, icono)
        this.estadosCatalog.set(
          (
            estados as {
              codigo?: string;
              value?: string;
              estado?: string;
              nombre?: string;
              label?: string;
              orden?: number;
              icono?: string;
              icon?: string;
            }[]
          ).map((e) => ({
            codigo: e.codigo ?? e.value ?? e.estado ?? '',
            nombre: e.nombre ?? e.label ?? '',
            orden: e.orden ?? 0,
            icono: e.icono ?? e.icon ?? 'bi-question',
          })),
        );
      } else {
        throw new Error('Offline');
      }
    } catch {
      console.warn('Usando catálogo de estados offline (ESTADOS_FALLBACK)');
      this.estadosCatalog.set(ESTADOS_FALLBACK);
    }
  }

  /**
   * Descarga todos los medidores y las lecturas ya registradas, guardando todo en IndexedDB
   */
  async fetchAndCacheMeters(): Promise<void> {
    this.isLoadingMeters.set(true);
    try {
      // 1. Descargar catálogo completo de medidores para sincronización offline
      await this.syncService.downloadAssignedData();
      await this.meterCache.load();

      // 2. Descargar lecturas ya registradas en el periodo actual
      const operatorId = this.authService.currentUser()?.id;
      const scope = operatorId ? `operator:${operatorId}` : 'assigned';
      const snapshot = await this.dbService.getAssignedSnapshot(scope);
      this.registeredReadings.set(snapshot?.registeredReadings ?? []);

      this.toastService.success(
        'Catálogo y lecturas del período actual actualizados para uso offline.',
        'Sincronizado',
      );
    } catch (err) {
      console.error('Error al sincronizar datos para offline:', err);
      this.toastService.error(
        'No se pudo actualizar el catálogo y lecturas desde el servidor.',
        'Error',
      );
    } finally {
      this.isLoadingMeters.set(false);
    }
  }

  // --- Step Navigation & State Machine Transitions ---

  selectMeter(meter: IMeterDto): void {
    this.searchQuery.set('');
    this.state.set({ kind: 'actions', meter });

    // Pre-load previous reading value for the Lectura sub-form (always preserve real lecturaAnterior)
    const existing = this.getOrderRecord(meter);
    const prevReading = existing?.lecturaAnterior ?? 0;
    this.lecturaAnteriorPreloaded.set(prevReading);
  }

  goToReadingForm(): void {
    const s = this.state();
    if (s.kind === 'actions' || s.kind === 'form') {
      this.state.set({ kind: 'form', meter: s.meter, tipo: 'LECTURA' });
    }
  }

  goToWorkOrderForm(tipo: WorkOrderActivityType): void {
    const s = this.state();
    if (s.kind === 'actions' || s.kind === 'form') {
      this.state.set({ kind: 'form', meter: s.meter, tipo });
    }
  }

  goToNoveltyForm(): void {
    const meter = this.selectedMeter();
    if (meter) {
      const lecturaId = this.resolveLecturaIdFor(meter);
      const primaryOrder = this.primaryWorkOrderFor(meter);
      const ordenTrabajoId = primaryOrder ? primaryOrder[1].id : null;
      this.router.navigate(['/app/operador/novedades/new'], {
        queryParams: {
          medidorId: meter.medidorId,
          ...(lecturaId ? { lecturaId } : {}),
          ...(ordenTrabajoId ? { ordenTrabajoId } : {}),
        },
      });
    }
  }

  /**
   * Tipos de orden de trabajo pendientes para un medidor.
   * Devuelve un Set para que el template use @if (set.has(...)) con un solo lookup.
   */
  workOrderTypesFor(meter: IMeterDto): Set<WorkOrderActivityType> {
    return new Set(this.actionableWorkOrdersFor(meter).map(([type]) => type));
  }

  actionableWorkOrdersFor(meter: IMeterDto): [WorkOrderActivityType, AssignedWorkOrder][] {
    const existing = this.getOrderRecord(meter);
    const isRelectura = existing?.estado === 'RECHAZADA_VERIFICACION';
    return [...(this.workOrdersByMeter().get(meter.serie)?.entries() ?? [])].filter(
      ([type, workOrder]) =>
        workOrder.estado === 'PENDIENTE' ||
        workOrder.estado === 'EN_PROGRESO' ||
        (isRelectura && type === 'LECTURA'),
    );
  }

  primaryWorkOrderFor(meter: IMeterDto): [WorkOrderActivityType, AssignedWorkOrder] | undefined {
    const actionable = this.actionableWorkOrdersFor(meter)[0];
    if (actionable && actionable[0]) return actionable;
    const all = [...(this.workOrdersByMeter().get(meter.serie)?.entries() ?? [])];
    const fallback = all.find(([type]) => !!type);
    if (fallback) return fallback;
    return undefined;
  }

  workOrderStateLabel(state: WorkOrderState): string {
    return {
      PENDIENTE: 'Pendiente de ejecución',
      EN_PROGRESO: 'En progreso',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
      FALLIDA: 'Fallida',
    }[state];
  }

  readingStateLabel(meter: IMeterDto): string {
    const existing = this.getOrderRecord(meter);
    const state = existing?.estado;
    if (!state) return 'Sin lectura';
    if (state === 'RECHAZADA_VERIFICACION') return 'Verificación requerida';
    return this.estadosCatalog().find((item) => item.codigo === state)?.nombre ?? state;
  }

  initialLecturaActualFor(meter: IMeterDto): number | null {
    const record = this.getOrderRecord(meter);
    if (record?.lecturaActual != null && !isNaN(Number(record.lecturaActual))) {
      return Number(record.lecturaActual);
    }
    return null;
  }

  initialDescripcionAnomaliaFor(meter: IMeterDto): string | null {
    const record = this.getOrderRecord(meter);
    return (record?.['descripcionAnomalia'] as string) || null;
  }

  private workOrderIdFor(meter: IMeterDto, tipo: WorkOrderActivityType): string | undefined {
    const workOrder = this.workOrdersByMeter().get(meter.serie)?.get(tipo);
    if (workOrder?.estado === 'PENDIENTE' || workOrder?.estado === 'EN_PROGRESO') {
      return workOrder.id;
    }
    if (workOrder?.id) return workOrder.id;
    if (meter.medidorId < 0) {
      return Math.abs(meter.medidorId).toString();
    }
    return undefined;
  }

  private resolveLecturaIdFor(meter: IMeterDto): string | null {
    // 1. Existing reading map (indexed by medidorId, serie, and contratoId)
    const existingReading =
      this.existingReadingMap().get(meter.medidorId.toString()) ||
      this.existingReadingMap().get(meter.serie) ||
      (meter.contratoId ? this.existingReadingMap().get(meter.contratoId.toString()) : null);
    if (existingReading?.lecturaId) return String(existingReading.lecturaId);
    if (existingReading?._lecturaId) return String(existingReading._lecturaId);

    // 2. Direct search in registeredReadings
    const reg = (this.registeredReadings() as unknown as Record<string, unknown>[]).find(
      (r: Record<string, unknown>) => {
        const medidor = r['medidor'] as Record<string, unknown> | undefined;
        const mId = medidor?.['medidorId'] ?? r['medidorId'];
        const s = medidor?.['serie'] ?? r['medidorSerie'];
        return (
          (mId != null && String(mId) === String(meter.medidorId)) ||
          (s && s === meter.serie) ||
          (r['contratoId'] &&
            meter.contratoId &&
            String(r['contratoId']) === String(meter.contratoId))
        );
      },
    );
    if (reg && 'lecturaId' in reg && reg['lecturaId']) return String(reg['lecturaId']);

    // 3. Assigned work orders by meter
    const checkAssignments = (assignments?: Map<WorkOrderActivityType, AssignedWorkOrder>) => {
      if (!assignments) return null;
      const woLectura = assignments.get('LECTURA');
      if (woLectura?.lecturaId) return String(woLectura.lecturaId);
      for (const wo of assignments.values()) {
        if (wo.lecturaId) return String(wo.lecturaId);
      }
      return null;
    };

    const fromByMeter =
      checkAssignments(this.workOrdersByMeter().get(meter.serie)) ||
      (meter.contratoId
        ? checkAssignments(this.workOrdersByMeter().get(meter.contratoId.toString()))
        : null) ||
      checkAssignments(this.workOrdersByMeter().get(meter.medidorId.toString()));
    if (fromByMeter) return fromByMeter;

    // 4. From activeOperatorRoute in state or sessionStorage
    try {
      let route: Record<string, unknown> | null = null;
      if (history.state && history.state.route) {
        route = history.state.route as Record<string, unknown>;
      } else {
        const raw = sessionStorage.getItem('activeOperatorRoute');
        if (raw) route = JSON.parse(raw) as Record<string, unknown>;
      }
      const rawOrdenes = route?.['ordenesTrabajo'];
      if (Array.isArray(rawOrdenes) && rawOrdenes.length) {
        const match = rawOrdenes.find((item) => {
          const o = item as Record<string, unknown>;
          const med = o['medidor'] as Record<string, unknown> | undefined;
          const con = o['contrato'] as Record<string, unknown> | undefined;
          return (
            med?.['serie'] === meter.serie ||
            (med?.['medidorId'] != null && String(med['medidorId']) === String(meter.medidorId)) ||
            (meter.contratoId &&
              (con?.['numeroContrato'] === meter.contratoId ||
                String(o['contratoId']) === String(meter.contratoId))) ||
            `OT-${o['ordenTrabajoId']}` === meter.serie
          );
        });
        const m = match as Record<string, unknown> | undefined;
        if (m && 'lecturaId' in m && m['lecturaId']) return String(m['lecturaId']);
      }
    } catch {
      // Ignorar errores de parseo
    }

    return null;
  }

  goBackToSearch(): void {
    this.state.set({ kind: 'search' });
  }

  goBackToActions(): void {
    const s = this.state();
    if (s.kind === 'form') {
      this.state.set({ kind: 'actions', meter: s.meter });
    }
  }

  clearSelection(): void {
    this.goBackToSearch();
  }

  /**
   * Entry point called by each work-order sub-form via (formSubmit).
   * Dispatches by `tipoActividad` to the right backend endpoint:
   *   - LECTURA       → PATCH /operator/readings/:id or POST /readings (submitReading)
   *   - INSTALACION
   *     INSPECCION
   *     RECONEXION    → PATCH /operator/work-orders/:id (submitWorkOrder, ticket #261)
   *
   * Antes este handler reusaba submitReading para los 4 tipos → bug que rompía
   * los 3 forms nuevos en producción. Ver Shortcut #262 para el contexto completo.
   */
  async onWorkOrderSubmit(formPayload: WorkOrderFormPayload): Promise<void> {
    const meter = this.selectedMeter();
    if (!meter) return;

    this.submissionFeedback.set(null);
    this.failedSubmission.set(null);
    this.isSaving.set(true);
    let existingId = this.resolveLecturaIdFor(meter);

    if (!existingId && this.networkService.isOnline()) {
      try {
        const fresh = (await this.syncService.getCurrentPeriodReadings()) as ReadingRecord[];
        if (fresh?.length) {
          await this.dbService.saveRegisteredReadingsCache(fresh);
          this.registeredReadings.set(fresh);
          existingId = this.resolveLecturaIdFor(meter);
        }
      } catch {
        // Silencioso
      }
    }

    try {
      if (formPayload.tipoActividad === 'LECTURA') {
        const ordenTrabajoId = this.workOrderIdFor(meter, 'LECTURA');
        if (!ordenTrabajoId) {
          throw new Error(
            'No se encontró la orden de trabajo asociada a esta lectura. Actualiza los datos del operador e intenta nuevamente.',
          );
        }
        // El backend guarda GPS en la orden, no en PATCH /readings/:id. Se registra primero
        // para no dejar una lectura aceptada sin su ubicación si la operación GPS falla.
        await this.syncService.submitReadingCoordinates(ordenTrabajoId);
        const lecturaPayload = {
          fecha: new Date().toISOString(),
          medidorId: meter.medidorId.toString(),
          medidorSerie: meter.serie,
          lecturaAnterior: formPayload.lecturaAnterior,
          lecturaActual: formPayload.lecturaActual,
          consumoCalculado: calculateConsumo(
            formPayload.lecturaAnterior,
            formPayload.lecturaActual,
          ),
          ...(formPayload.descripcionAnomalia
            ? { descripcionAnomalia: formPayload.descripcionAnomalia }
            : {}),
          ...(formPayload.fotoBlob ? { fotoBlob: formPayload.fotoBlob } : {}),
          ...(existingId ? { _lecturaId: existingId } : {}),
        };
        const response = await this.syncService.submitReading(lecturaPayload);
        await this.updateReadingsCacheAfterSubmit(response);
        this.setSubmissionSuccess(response as { offline?: boolean });
        this.completedWorkOrderIds.update((set) => new Set([...set, meter.medidorId.toString()]));
      } else {
        // INSTALACION / INSPECCION / RECONEXION → endpoint dedicado (#261)
        const ordenTrabajoId = this.workOrderIdFor(meter, formPayload.tipoActividad);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workOrderPayload: any = {
          ordenTrabajoId,
          ...formPayload,
          medidorId: meter.medidorId.toString(),
          fecha: new Date().toISOString(),
        };
        const response = await this.syncService.submitWorkOrder(workOrderPayload);
        this.setSubmissionSuccess(response as { offline?: boolean });
        this.completedWorkOrderIds.update((set) => new Set([...set, meter.medidorId.toString()]));
      }

      this.goBackToSearch();
      await this.loadPendingReadings();
      await this.loadCachedMeters();
    } catch (e) {
      const isFatalError =
        e instanceof Error &&
        (e.message.includes('ubicación') ||
          e.message.includes('GPS') ||
          e.message.includes('orden de trabajo asociada'));

      // Fallback a almacenamiento local offline si falló la llamada remota por red para no perder los datos del operario
      if (formPayload.tipoActividad === 'LECTURA' && !isFatalError) {
        try {
          await this.dbService.savePendingReading({
            fecha: new Date().toISOString(),
            medidorId: meter.medidorId.toString(),
            medidorSerie: meter.serie,
            ...formPayload,
          });
          await this.syncService.refreshPendingCounts();
          this.setSubmissionSuccess({ offline: true });
          this.completedWorkOrderIds.update((set) => new Set([...set, meter.medidorId.toString()]));
          this.goBackToSearch();
          await this.loadPendingReadings();
          await this.loadCachedMeters();
          return;
        } catch (dbErr) {
          console.error('Error al guardar fallback en IndexedDB:', dbErr);
        }
      }
      this.failedSubmission.set(formPayload);
      const localMessage =
        e instanceof Error &&
        (e.message.includes('ubicación') || e.message.includes('orden de trabajo asociada'))
          ? e.message
          : 'Tus datos se conservaron. Revisa la conexión y reintenta el envío.';
      this.submissionFeedback.set({
        kind: 'error',
        title: 'No se pudo enviar',
        message: localMessage,
      });
      this.toastService.error(localMessage, 'Error');
    } finally {
      this.isSaving.set(false);
    }
  }

  private setSubmissionSuccess(response: { offline?: boolean } | null): void {
    const queued = response?.offline === true;
    this.submissionFeedback.set({
      kind: queued ? 'queued' : 'synced',
      title: queued ? 'Guardado en cola' : 'Enviado y sincronizado',
      message: queued
        ? 'Se enviará automáticamente cuando vuelva la conexión.'
        : 'El registro fue enviado correctamente al servidor.',
    });
  }

  retryFailedSubmission(): void {
    const payload = this.failedSubmission();
    if (payload) void this.onWorkOrderSubmit(payload);
  }

  /**
   * Persiste la respuesta del backend en el caché local de lecturas registradas,
   * manteniendo la UI sincronizada cuando vuelve online.
   */
  private async updateReadingsCacheAfterSubmit(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any,
  ): Promise<void> {
    const operatorId = this.authService.currentUser()?.id;
    const scope = operatorId ? `operator:${operatorId}` : undefined;
    const currentReadings = await this.dbService.getRegisteredReadingsCache(scope);
    const exists = currentReadings.some(
      (r: { lecturaId?: string }) => r.lecturaId === response.lecturaId,
    );
    const updated = exists
      ? currentReadings.map((r: { lecturaId?: string }) =>
          r.lecturaId === response.lecturaId ? response : r,
        )
      : [...currentReadings, response];
    await this.dbService.saveRegisteredReadingsCache(updated, scope);
    this.registeredReadings.set(updated);
  }

  async forceSync(): Promise<void> {
    await this.syncService.syncPendingData();
    await this.loadPendingReadings();
    await this.loadCachedMeters();
  }
}
