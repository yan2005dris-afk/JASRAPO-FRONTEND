import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { OperatorService } from '../service/operator.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { AuthService } from '../../../core/services/auth.service';
import { MeterCacheService } from '../../../core/services/meter-cache.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IMeterDto } from '../../contracts/meters/interfaces/imeter.interface';
import { MeterSearchBoxComponent } from '../components/meter-search-box/meter-search-box.component';
import { MeterCardComponent } from '../components/meter-card/meter-card.component';
import { SelectedMeterCardComponent } from '../components/selected-meter-card/selected-meter-card.component';
import { RouteTypePipe } from '../../../shared/pipes/route-type.pipe';
import { firstValueFrom } from 'rxjs';
import {
  EstadoInfo,
  EstadoChip,
  MeterGroup,
  MobileStep,
  LecturaState,
  READING_STATE_ORDER,
  ESTADOS_FALLBACK,
} from './readings.models';
import { LecturaFormComponent } from '../components/work-order-forms/lectura-form.component';
import { InstalacionFormComponent } from '../components/work-order-forms/instalacion-form.component';
import { InspeccionFormComponent } from '../components/work-order-forms/inspeccion-form.component';
import { ReconexionFormComponent } from '../components/work-order-forms/reconexion-form.component';
import { calculateConsumo, type WorkOrderFormPayload } from '../models/work-order-form.models';
import type { WorkOrderActivityType, WorkOrderState } from '../models/operator.models';

type AssignedWorkOrderType = Exclude<WorkOrderActivityType, 'LECTURA'>;

interface AssignedWorkOrder {
  id: string;
  estado: WorkOrderState;
}

interface SubmissionFeedback {
  kind: 'error' | 'queued' | 'synced';
  title: string;
  message: string;
}

/** Registro de lectura proveniente del backend o IndexedDB. */
interface ReadingRecord {
  lecturaId?: string;
  _lecturaId?: string;
  medidorId?: string | number;
  medidor?: { medidorId?: string | number };
  estado?: string;
  syncState?: string;
  [key: string]: unknown;
}

import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-operator-readings',
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule,
    MeterSearchBoxComponent,
    MeterCardComponent,
    SelectedMeterCardComponent,
    RouteTypePipe,
    LecturaFormComponent,
    InstalacionFormComponent,
    InspeccionFormComponent,
    ReconexionFormComponent,
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
  private readonly operatorService = inject(OperatorService);
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
  readonly searchQuery = signal<string>('');
  readonly isLoadingMeters = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly submissionFeedback = signal<SubmissionFeedback | null>(null);
  private readonly failedSubmission = signal<WorkOrderFormPayload | null>(null);

  // Lecturas registradas en el período activo (memoria local/caché)
  readonly registeredReadings = signal<ReadingRecord[]>([]);
  readonly pendingReadings = signal<ReadingRecord[]>([]);

  // IDs de medidores con lecturas en estado no editable por el operador (POR_REVISION, APROBADA, etc.)
  readonly readMetersIds = computed(() => {
    const registered = this.registeredReadings();
    const pending = this.pendingReadings();
    const ids = new Set<string>();
    for (const r of registered) {
      const mId = r.medidor?.medidorId ?? r.medidorId;
      if (mId && r.estado !== 'PENDIENTE' && r.estado !== 'RECHAZADA_VERIFICACION') {
        ids.add(mId.toString());
      }
    }
    for (const p of pending) {
      if (p.medidorId && p.estado !== 'PENDIENTE' && p.estado !== 'RECHAZADA_VERIFICACION') {
        ids.add(p.medidorId.toString());
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

  // Mapa medidorId → lectura existente (de registeredReadings + pendingReadings)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly existingReadingMap = computed<Map<string, any>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>();
    for (const r of this.registeredReadings()) {
      // Backend response nests medidorId inside medidor object
      const mId = r.medidor?.medidorId ?? r.medidorId;
      if (mId != null) map.set(mId.toString(), r);
    }
    for (const p of this.pendingReadings()) {
      const mId = p.medidorId;
      if (mId != null) {
        map.set(mId.toString(), {
          ...map.get(mId.toString()),
          ...p,
          estado: p.estado || 'POR_REVISION',
        });
      }
    }
    return map;
  });

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
      const info = isSinLectura
        ? { label: 'Sin Lectura', icon: 'bi-clock', cssClass: null as string | null }
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
    let list = this.metersList();

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
      const cachedReadings = await this.dbService.getRegisteredReadingsCache(scope);
      this.registeredReadings.set(cachedReadings);

      // Si se pasó una serie específica en la query URL y no estaba seleccionada
      const singleSerie = this.activatedRoute.snapshot.queryParamMap.get('serie');
      if (singleSerie && !this.selectedMeter()) {
        const meter = this.metersList().find((m) => m.serie === singleSerie);
        if (meter) this.selectMeter(meter);
      }
    } catch (e) {
      console.error('Error al cargar caché offline:', e);
    }
  }

  private autoSelectFromQueryParam(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    const rutaNombre = params.get('rutaNombre');
    const rutaTipo = params.get('rutaTipo');
    const seriesParam = params.get('series');
    const singleSerie = params.get('serie');
    const workOrdersParam = params.get('workOrders');

    if (rutaNombre && rutaTipo) {
      this.routeContext.set({ nombre: rutaNombre, tipo: rutaTipo });
    }

    // Build a lookup map: serie → activity type → assigned work-order ID.
    // Format: "SERIE1:INSTALACION:ORDER_ID:ESTADO;INSPECCION:OTHER_ID:ESTADO".
    // Legacy assignments without estado default to PENDIENTE.
    if (workOrdersParam) {
      const workOrdersByMeter = new Map<string, Map<WorkOrderActivityType, AssignedWorkOrder>>();
      for (const entry of workOrdersParam.split(',')) {
        const [serie, assignmentsCsv] = entry.split(/:(.*)/s);
        if (!serie || !assignmentsCsv) continue;
        const assignments = new Map<WorkOrderActivityType, AssignedWorkOrder>();
        for (const assignment of assignmentsCsv.split(';')) {
          const [tipo, ordenTrabajoId = '', estado = 'PENDIENTE'] = assignment.split(':');
          const t = tipo.trim() as WorkOrderActivityType;
          const workOrderState = estado.trim() as WorkOrderState;
          if (t && ordenTrabajoId.trim()) {
            assignments.set(t, { id: ordenTrabajoId.trim(), estado: workOrderState });
          }
        }
        if (assignments.size) workOrdersByMeter.set(serie.trim(), assignments);
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
      this.allowedSeries.set(set);
    }

    if (singleSerie) {
      const meter = this.metersList().find((m) => m.serie === singleSerie);
      if (meter) this.selectMeter(meter);
    }
  }

  /**
   * Carga las lecturas pendientes del caché IndexedDB
   */
  private async loadPendingReadings(): Promise<void> {
    try {
      const pending = await this.dbService.getPendingReadings();
      this.pendingReadings.set(pending);
    } catch (e) {
      console.error('Error al cargar lecturas pendientes:', e);
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
      const meters = await firstValueFrom(this.operatorService.syncAllMeters());
      await this.dbService.saveMetersCache(meters);
      await this.meterCache.load();

      // 2. Descargar lecturas ya registradas en el periodo actual
      const readings = await this.syncService.getCurrentPeriodReadings();
      await this.dbService.saveRegisteredReadingsCache(readings);
      this.registeredReadings.set(readings);

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

    // Pre-load previous reading value for the Lectura sub-form
    const existing = this.existingReadingMap().get(meter.medidorId.toString());
    this.lecturaAnteriorPreloaded.set(existing?.lecturaActual ?? 0);
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
      const existing = this.existingReadingMap().get(meter.medidorId.toString());
      const lecturaId = existing?.lecturaId ?? existing?._lecturaId ?? null;
      this.router.navigate(['/app/operador/novedades/new'], {
        queryParams: { medidorId: meter.medidorId, lecturaId },
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
    return [...(this.workOrdersByMeter().get(meter.serie)?.entries() ?? [])].filter(
      ([, workOrder]) => workOrder.estado === 'PENDIENTE' || workOrder.estado === 'EN_PROGRESO',
    );
  }

  primaryWorkOrderFor(meter: IMeterDto): [WorkOrderActivityType, AssignedWorkOrder] | undefined {
    return this.actionableWorkOrdersFor(meter)[0];
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
    const state = this.existingReadingMap().get(meter.medidorId.toString())?.estado;
    if (!state) return 'Sin lectura';
    return this.estadosCatalog().find((item) => item.codigo === state)?.nombre ?? state;
  }

  private workOrderIdFor(meter: IMeterDto, tipo: AssignedWorkOrderType): string | undefined {
    const workOrder = this.workOrdersByMeter().get(meter.serie)?.get(tipo);
    if (workOrder?.estado !== 'PENDIENTE' && workOrder?.estado !== 'EN_PROGRESO') {
      return undefined;
    }
    return workOrder.id;
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
    const existingReading = this.existingReadingMap().get(meter.medidorId.toString());
    // Cubrimos ambos nombres del id (`lecturaId` para backend actual, `_lecturaId` para
    // serialización legacy en IndexedDB). Si existe, lo mandamos al endpoint para PATCH.
    const existingId = existingReading?.lecturaId ?? existingReading?._lecturaId ?? null;

    try {
      if (formPayload.tipoActividad === 'LECTURA') {
        const lecturaPayload = {
          fecha: new Date().toISOString(),
          medidorId: meter.medidorId.toString(),
          lecturaAnterior: formPayload.lecturaAnterior,
          lecturaActual: formPayload.lecturaActual,
          lecturaInicial: formPayload.lecturaInicial,
          // Clamp defensivo: si lecturaActual < lecturaAnterior y no es inicial,
          // forzamos 0 para no mandar valores negativos al backend.
          consumoCalculado: calculateConsumo(
            formPayload.lecturaAnterior,
            formPayload.lecturaActual,
            formPayload.lecturaInicial,
          ),
          ...(formPayload.descripcionAnomalia
            ? { descripcionAnomalia: formPayload.descripcionAnomalia }
            : {}),
          ...(formPayload.fotoBase64 ? { fotoBase64: formPayload.fotoBase64 } : {}),
          ...(existingId ? { _lecturaId: existingId } : {}),
        };
        const response = await this.syncService.submitReading(lecturaPayload);
        await this.updateReadingsCacheAfterSubmit(response);
        this.setSubmissionSuccess(response);
      } else {
        // INSTALACION / INSPECCION / RECONEXION → endpoint dedicado (#261)
        const ordenTrabajoId = this.workOrderIdFor(
          meter,
          formPayload.tipoActividad as AssignedWorkOrderType,
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workOrderPayload: any = {
          ordenTrabajoId,
          ...formPayload,
          medidorId: meter.medidorId.toString(),
          fecha: new Date().toISOString(),
        };
        const response = await this.syncService.submitWorkOrder(workOrderPayload);
        this.setSubmissionSuccess(response);
      }

      this.goBackToSearch();
      await this.loadPendingReadings();
      await this.loadCachedMeters();
    } catch (e) {
      console.error('Error al registrar orden de trabajo:', e);
      this.failedSubmission.set(formPayload);
      this.submissionFeedback.set({
        kind: 'error',
        title: 'No se pudo enviar',
        message: 'Tus datos se conservaron. Revisa la conexión y reintenta el envío.',
      });
      this.toastService.error('Los datos se conservaron. Puedes reintentar el envío.', 'Error');
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
    if (!this.networkService.isOnline() || !response?.lecturaId) return;
    const currentReadings = await this.dbService.getRegisteredReadingsCache();
    const exists = currentReadings.some(
      (r: { lecturaId?: string }) => r.lecturaId === response.lecturaId,
    );
    const updated = exists
      ? currentReadings.map((r: { lecturaId?: string }) =>
          r.lecturaId === response.lecturaId ? response : r,
        )
      : [...currentReadings, response];
    await this.dbService.saveRegisteredReadingsCache(updated);
  }

  async forceSync(): Promise<void> {
    await this.syncService.syncPendingData();
    await this.loadPendingReadings();
    await this.loadCachedMeters();
  }
}
