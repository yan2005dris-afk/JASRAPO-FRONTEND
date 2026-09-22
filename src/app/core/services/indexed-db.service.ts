/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import {
  MANIFEST_PHYSICAL_ENTITY_TYPE,
  MANIFEST_PROTOCOL_VERSION,
  type OperatorManifestPage,
} from '../../features/operator/models/operator.models';

export type SyncState = 'PENDIENTE_SYNC' | 'RECHAZADA';

export interface PendingRecord {
  id?: number;
  syncState: SyncState;
  errorMessage: string | null;
  [key: string]: any;
}

export interface AssignedSnapshot {
  scope: string;
  operatorId?: string | number | null;
  routes: any[];
  meters: any[];
  registeredReadings: any[];
  workOrders: any[];
  pendingAnomalies: any[];
  snapshotVersion?: string;
  manifestProtocolVersion?: number;
  periodId?: string;
  cursor?: string | null;
  complete?: boolean;
  estados?: any[];
  savedAt: string;
}

export interface RoutesCacheResult<T> {
  items: T[];
  savedAt: string;
}

/**
 * Merge key for routes: the sync manifest and GET /operator/routes describe the same physical
 * entity, matched by `rutaId` (work orders by `ordenTrabajoId`). The manifest ARRAY ORDER is
 * pagination/cursor mechanics (updatedAt asc, id asc) and must never be used as visit order; the
 * hydrated cache (rutas_cache) keeps the online visit order and is the BASE of every merge.
 */
const ROUTE_SNAPSHOT_MUTABLE_FIELDS = [
  'estado',
  'orden',
  'nombre',
  'tipoRuta',
  'descripcion',
  'observacion',
  'fechaLimite',
  'fechaPlanificada',
  'operarioId',
  'comunidadId',
  'sectorId',
] as const;

const ROUTE_HYDRATED_ARRAY_FIELDS = ['paradas', 'ordenesTrabajo', 'rutaPuntos'] as const;

const WORK_ORDER_SNAPSHOT_MUTABLE_FIELDS = ['estado', 'resultadoObservacion', 'completadoEn'] as const;

function identityOf(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function snapshotRouteById(routes: any[] | undefined): Map<string, any> {
  const byId = new Map<string, any>();
  for (const route of routes ?? []) {
    const id = identityOf(route?.rutaId);
    if (id && !byId.has(id)) byId.set(id, route);
  }
  return byId;
}

function isRouteHydrated(route: any): boolean {
  return (
    (Array.isArray(route?.paradas) && route.paradas.length > 0) ||
    (Array.isArray(route?.ordenesTrabajo) && route.ordenesTrabajo.length > 0) ||
    (Array.isArray(route?.rutaPuntos) && route.rutaPuntos.length > 0) ||
    (identityOf(route?.medidor?.latitud) !== '' && identityOf(route?.medidor?.longitud) !== '')
  );
}

function refreshRouteFromSnapshot(hydratedRoute: any, snapshotRoute: any): any {
  const merged = { ...hydratedRoute };
  for (const field of ROUTE_SNAPSHOT_MUTABLE_FIELDS) {
    const value = snapshotRoute?.[field];
    if (value !== undefined) merged[field] = value;
  }
  // Hydrated collections (paradas/ordenesTrabajo/rutaPuntos) must never be replaced by the
  // snapshot equivalents, which the manifest ships stripped ([]).
  for (const field of ROUTE_HYDRATED_ARRAY_FIELDS) {
    if (merged[field] != null) continue;
    const value = snapshotRoute?.[field];
    if (value !== undefined) merged[field] = value;
  }
  return merged;
}

/**
 * Re-hydrates a route that has no coordinate-bearing collections by attaching the manifest work
 * orders of its `rutaId`. Ordering follows `ordenVisita`, preserving visit-order semantics; the
 * entries come from the manifest collection, never from the route list array order.
 */
function clientHydrateRoute(route: any, workOrders: any[] | undefined): any {
  const hydrated = { ...route };
  if (!workOrders?.length) return hydrated;
  const orders = workOrders
    .filter((order) => identityOf(order?.rutaId) === identityOf(route.rutaId))
    .slice()
    .sort((a, b) => (a?.ordenVisita ?? 0) - (b?.ordenVisita ?? 0));
  const existing = hydrated.ordenesTrabajo;
  if (orders.length > 0 && (!Array.isArray(existing) || existing.length === 0)) {
    hydrated.ordenesTrabajo = orders;
  }
  return hydrated;
}

/**
 * Merges the manifest snapshot routes into the hydrated cache (rutas_cache):
 * - Existing hydrated routes keep their hydrated arrays and relative visit order; only mutable
 *   scalar state (estado, fechas, orden, ...) is refreshed from the snapshot.
 * - Routes present only in the snapshot are appended, hydrated from the manifest work-orders
 *   collection when possible; otherwise they stay stripped.
 */
export function mergeHydratedRoutesWithSnapshot<T>(
  hydratedRoutes: T[] | undefined,
  snapshotRoutes: T[] | undefined,
  snapshotWorkOrders?: any[],
): T[] {
  const hydrated = hydratedRoutes ?? [];
  const snapshot = snapshotRoutes ?? [];
  if (snapshot.length === 0) return [...hydrated];

  const snapshotById = snapshotRouteById(snapshot);
  const presentIds = new Set(
    hydrated.map((route) => identityOf((route as any)?.rutaId)).filter((id) => id !== ''),
  );

  const merged: any[] = hydrated.map((route) => {
    const snapshotRoute = snapshotById.get(identityOf((route as any)?.rutaId));
    return snapshotRoute ? refreshRouteFromSnapshot(route, snapshotRoute) : route;
  });

  for (const snapshotRoute of snapshot) {
    const id = identityOf((snapshotRoute as any)?.rutaId);
    if (!id || presentIds.has(id)) continue;
    presentIds.add(id);
    merged.push(clientHydrateRoute(snapshotRoute, snapshotWorkOrders));
  }

  return merged.map((route) =>
    isRouteHydrated(route) ? route : clientHydrateRoute(route, snapshotWorkOrders),
  );
}

/**
 * Merges the manifest work-orders collection into the work orders already hydrated inside
 * rutas_cache. Known orders keep their hydrated position (visit order is never re-sequenced by the
 * manifest keyset order) and only receive refreshed mutable state; unknown orders are appended.
 */
export function mergeWorkOrdersWithSnapshot(
  hydratedWorkOrders: any[] | undefined,
  snapshotWorkOrders: any[] | undefined,
): any[] {
  const base = hydratedWorkOrders ?? [];
  const snapshot = snapshotWorkOrders ?? [];
  if (snapshot.length === 0) return [...base];

  const merged: any[] = [];
  const seen = new Set<string>();
  for (const order of base) {
    const id = identityOf(order?.ordenTrabajoId ?? order?.id);
    const snapshotOrder = id
      ? snapshot.find((s) => identityOf(s?.ordenTrabajoId ?? s?.id) === id)
      : undefined;
    const mergedOrder = snapshotOrder ? { ...order } : order;
    if (snapshotOrder) {
      for (const field of WORK_ORDER_SNAPSHOT_MUTABLE_FIELDS) {
        const value = snapshotOrder[field];
        if (value !== undefined) mergedOrder[field] = value;
      }
    }
    merged.push(mergedOrder);
    if (id) seen.add(id);
  }
  for (const order of snapshot) {
    const id = identityOf(order?.ordenTrabajoId ?? order?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(order);
  }
  return merged;
}

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  private readonly dbName = 'jasrapo-operator-db';
  private readonly dbVersion = 11;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;

        // Almacén para snapshot completo unificado por operador (aislamiento total)
        if (!db.objectStoreNames.contains('assigned_snapshots')) {
          db.createObjectStore('assigned_snapshots', { keyPath: 'scope' });
        }

        // Almacén para caché de medidores
        if (!db.objectStoreNames.contains('medidores_cache')) {
          db.createObjectStore('medidores_cache', { keyPath: 'medidorId' });
        }

        // Almacén para lecturas pendientes
        if (!db.objectStoreNames.contains('lecturas_pendientes')) {
          const store = db.createObjectStore('lecturas_pendientes', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('bySyncState', 'syncState', { unique: false });
        } else if (oldVersion < 3) {
          // Migrar store existente: agregar índice por syncState
          const tx = (event.target as IDBOpenDBRequest).transaction!;
          const store = tx.objectStore('lecturas_pendientes');
          if (!store.indexNames.contains('bySyncState')) {
            store.createIndex('bySyncState', 'syncState', { unique: false });
          }
        }

        // Almacén para anomalías pendientes
        if (!db.objectStoreNames.contains('anomalias_pendientes')) {
          const store = db.createObjectStore('anomalias_pendientes', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('bySyncState', 'syncState', { unique: false });
        } else if (oldVersion < 3) {
          const tx = (event.target as IDBOpenDBRequest).transaction!;
          const store = tx.objectStore('anomalias_pendientes');
          if (!store.indexNames.contains('bySyncState')) {
            store.createIndex('bySyncState', 'syncState', { unique: false });
          }
        }

        // Almacén para lecturas registradas en el periodo actual
        if (!db.objectStoreNames.contains('lecturas_registradas')) {
          db.createObjectStore('lecturas_registradas', { keyPath: 'lecturaId' });
        }

        // Almacén para historial de lecturas sincronizadas exitosamente
        if (!db.objectStoreNames.contains('lecturas_sincronizadas')) {
          db.createObjectStore('lecturas_sincronizadas', { keyPath: 'id', autoIncrement: true });
        }

        // Almacén para catálogo de estados de lectura (offline-first)
        if (!db.objectStoreNames.contains('estados_cache')) {
          db.createObjectStore('estados_cache', { keyPath: 'tipo' });
        }

        // Snapshot de rutas asignadas para navegación degradada sin conexión
        if (!db.objectStoreNames.contains('rutas_cache')) {
          db.createObjectStore('rutas_cache', { keyPath: 'scope' });
        }

        // Caché offline de novedades (lecturas con anomalías) por operador
        if (!db.objectStoreNames.contains('novedades_cache')) {
          db.createObjectStore('novedades_cache', { keyPath: 'lecturaId' });
        }

        // Almacén dedicado para órdenes de trabajo pendientes offline (#267)
        if (!db.objectStoreNames.contains('ordenes_pendientes')) {
          const store = db.createObjectStore('ordenes_pendientes', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('bySyncState', 'syncState', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // --- MEDIDORES CACHE ---

  async saveMetersCache(meters: any[]): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('medidores_cache', 'readwrite');
      const store = transaction.objectStore('medidores_cache');

      // Reemplazo completo del snapshot para no dejar medidores obsoletos
      store.clear();

      for (const meter of meters) {
        store.put(meter);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getMetersCache(scope?: string): Promise<any[]> {
    const db = await this.initDb();

    // Si se pasa scope (e.g. 'operator:42'), buscar primero en el snapshot del operador
    if (scope && db.objectStoreNames.contains('assigned_snapshots')) {
      const snapshot = await this.getAssignedSnapshot(scope);
      if (snapshot?.meters) {
        return snapshot.meters;
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('medidores_cache', 'readonly');
      const store = transaction.objectStore('medidores_cache');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- LECTURAS PENDIENTES ---

  async savePendingReading(reading: any): Promise<number> {
    const db = await this.initDb();
    const record: PendingRecord = {
      ...reading,
      syncState: 'PENDIENTE_SYNC',
      errorMessage: null,
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_pendientes', 'readwrite');
      const store = transaction.objectStore('lecturas_pendientes');
      const request = store.add(record);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingReadings(): Promise<PendingRecord[]> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_pendientes', 'readonly');
      const store = transaction.objectStore('lecturas_pendientes');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingReadingsByState(state: SyncState): Promise<PendingRecord[]> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_pendientes', 'readonly');
      const store = transaction.objectStore('lecturas_pendientes');
      const index = store.index('bySyncState');
      const request = index.getAll(state);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePendingReading(id: number, updates: Partial<PendingRecord>): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_pendientes', 'readwrite');
      const store = transaction.objectStore('lecturas_pendientes');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          reject(new Error(`Lectura pendiente con id ${id} no encontrada.`));
          return;
        }
        const updated = { ...existing, ...updates };
        store.put(updated);
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deletePendingReading(id: number): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_pendientes', 'readwrite');
      const store = transaction.objectStore('lecturas_pendientes');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- ANOMALIAS PENDIENTES ---

  async savePendingAnomaly(anomaly: any): Promise<number> {
    const db = await this.initDb();
    const record: PendingRecord = {
      ...anomaly,
      syncState: 'PENDIENTE_SYNC',
      errorMessage: null,
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('anomalias_pendientes', 'readwrite');
      const store = transaction.objectStore('anomalias_pendientes');
      const request = store.add(record);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingAnomalies(): Promise<PendingRecord[]> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('anomalias_pendientes', 'readonly');
      const store = transaction.objectStore('anomalias_pendientes');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingAnomaliesByState(state: SyncState): Promise<PendingRecord[]> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('anomalias_pendientes', 'readonly');
      const store = transaction.objectStore('anomalias_pendientes');
      const index = store.index('bySyncState');
      const request = index.getAll(state);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePendingAnomaly(id: number, updates: Partial<PendingRecord>): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('anomalias_pendientes', 'readwrite');
      const store = transaction.objectStore('anomalias_pendientes');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          reject(new Error(`Anomalía pendiente con id ${id} no encontrada.`));
          return;
        }
        const updated = { ...existing, ...updates };
        store.put(updated);
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deletePendingAnomaly(id: number): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('anomalias_pendientes', 'readwrite');
      const store = transaction.objectStore('anomalias_pendientes');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- ORDENES DE TRABAJO PENDIENTES ---

  async savePendingWorkOrder(workOrder: any): Promise<number> {
    const db = await this.initDb();
    const record: PendingRecord = {
      ...workOrder,
      syncState: 'PENDIENTE_SYNC',
      errorMessage: null,
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('ordenes_pendientes', 'readwrite');
      const store = transaction.objectStore('ordenes_pendientes');
      const request = store.add(record);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingWorkOrders(): Promise<PendingRecord[]> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('ordenes_pendientes', 'readonly');
      const store = transaction.objectStore('ordenes_pendientes');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingWorkOrdersByState(state: SyncState): Promise<PendingRecord[]> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('ordenes_pendientes', 'readonly');
      const store = transaction.objectStore('ordenes_pendientes');
      const index = store.index('bySyncState');
      const request = index.getAll(state);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePendingWorkOrder(id: number, updates: Partial<PendingRecord>): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('ordenes_pendientes', 'readwrite');
      const store = transaction.objectStore('ordenes_pendientes');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          reject(new Error(`Orden de trabajo pendiente con id ${id} no encontrada.`));
          return;
        }
        const updated = { ...existing, ...updates };
        store.put(updated);
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deletePendingWorkOrder(id: number): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('ordenes_pendientes', 'readwrite');
      const store = transaction.objectStore('ordenes_pendientes');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- LECTURAS REGISTRADAS (CACHÉ PERÍODO ACTUAL) ---

  async saveRegisteredReadingsCache(readings: any[]): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_registradas', 'readwrite');
      const store = transaction.objectStore('lecturas_registradas');

      store.clear();

      for (const reading of readings) {
        store.put(reading);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getRegisteredReadingsCache(scope?: string): Promise<any[]> {
    const db = await this.initDb();

    // Si se pasa scope (e.g. 'operator:42'), buscar primero en el snapshot del operador
    if (scope && db.objectStoreNames.contains('assigned_snapshots')) {
      const snapshot = await this.getAssignedSnapshot(scope);
      if (snapshot?.registeredReadings) {
        return snapshot.registeredReadings;
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_registradas', 'readonly');
      const store = transaction.objectStore('lecturas_registradas');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- LECTURAS SINCRONIZADAS (historial) ---

  async saveSyncedReading(reading: any): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_sincronizadas', 'readwrite');
      const store = transaction.objectStore('lecturas_sincronizadas');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...rest } = reading;
      store.add({ ...rest, syncedAt: new Date().toISOString() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSyncedReadings(): Promise<any[]> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_sincronizadas', 'readonly');
      const store = transaction.objectStore('lecturas_sincronizadas');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncedReadings(): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('lecturas_sincronizadas', 'readwrite');
      const store = transaction.objectStore('lecturas_sincronizadas');
      store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- ESTADOS CACHE (offline-first) ---

  async saveEstadosCache(estados: any[]): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('estados_cache', 'readwrite');
      const store = transaction.objectStore('estados_cache');
      store.put({ tipo: 'estados_lectura', items: estados });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getEstadosCache(): Promise<any[] | null> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('estados_cache', 'readonly');
      const store = transaction.objectStore('estados_cache');
      const request = store.get('estados_lectura');
      request.onsuccess = () => resolve(request.result?.items ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  // --- SNAPSHOTS UNIFICADOS POR OPERADOR ---

  async discardPendingManifest(scope: string): Promise<void> {
    const db = await this.initDb();
    if (!db.objectStoreNames.contains('assigned_snapshots')) return;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('assigned_snapshots', 'readwrite');
      transaction.objectStore('assigned_snapshots').delete(`${scope}:pending`);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAssignedSnapshot(scope: string): Promise<AssignedSnapshot | null> {
    const db = await this.initDb();
    if (!db.objectStoreNames.contains('assigned_snapshots')) {
      return null;
    }
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('assigned_snapshots', 'readonly');
      const store = transaction.objectStore('assigned_snapshots');
      const request = store.get(scope);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Guarda un snapshot completo de forma atómica en una única transacción IndexedDB.
   * Almacena todo el conjunto en `assigned_snapshots` con scope por operador (aislamiento total),
   * y sincroniza las tablas individuales para compatibilidad.
   */
  async saveCompleteAssignedSnapshot(data: {
    routes: any[];
    meters: any[];
    registeredReadings: any[];
    workOrders?: any[];
    pendingAnomalies?: any[];
    estados?: any[];
    scope?: string;
    operatorId?: number | string;
  }): Promise<void> {
    const db = await this.initDb();
    const scope = data.scope ?? (data.operatorId ? `operator:${data.operatorId}` : 'assigned');
    const savedAt = new Date().toISOString();

    const snapshotRecord: AssignedSnapshot = {
      scope,
      operatorId: data.operatorId ?? null,
      routes: data.routes,
      meters: data.meters,
      registeredReadings: data.registeredReadings,
      workOrders: data.workOrders ?? [],
      pendingAnomalies: data.pendingAnomalies ?? [],
      manifestProtocolVersion: MANIFEST_PROTOCOL_VERSION,
      estados: data.estados ?? [],
      savedAt,
    };

    return new Promise((resolve, reject) => {
      const stores = [
        'assigned_snapshots',
        'rutas_cache',
        'medidores_cache',
        'lecturas_registradas',
        'estados_cache',
      ];
      const transaction = db.transaction(stores, 'readwrite');

      try {
        // 1. Snapshot unificado aislado por operador
        const snapshotStore = transaction.objectStore('assigned_snapshots');
        snapshotStore.put(snapshotRecord);

        // 2. Rutas
        const routeStore = transaction.objectStore('rutas_cache');
        routeStore.put({
          scope,
          operatorId: data.operatorId ?? null,
          items: data.routes,
          savedAt,
        });

        // 3. Medidores
        const meterStore = transaction.objectStore('medidores_cache');
        meterStore.clear();
        for (const meter of data.meters ?? []) {
          meterStore.put(meter);
        }

        // 4. Lecturas registradas
        const readingStore = transaction.objectStore('lecturas_registradas');
        readingStore.clear();
        for (const reading of data.registeredReadings ?? []) {
          readingStore.put(reading);
        }

        // 5. Estados de lectura
        if (data.estados && data.estados.length > 0) {
          const estadosStore = transaction.objectStore('estados_cache');
          estadosStore.put({ tipo: 'estados_lectura', items: data.estados });
        }
      } catch (err) {
        transaction.abort();
        reject(err);
        return;
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private normalizeManifestCollection(collection: unknown): any[] | undefined {
    if (collection === undefined) return undefined;
    if (Array.isArray(collection)) return collection;
    if (typeof collection !== 'object' || collection === null) {
      throw new Error('Invalid manifest collection: items must be an array');
    }
    const value = collection as Record<string, unknown>;
    if (Array.isArray(value['items'])) return value['items'];
    if (value['data'] !== undefined) return this.normalizeManifestCollection(value['data']);
    throw new Error('Invalid manifest collection: items must be an array');
  }

  /** Applies one manifest page and its tombstones in one IndexedDB transaction. */
  async applyManifestPage(
    scope: string,
    page: OperatorManifestPage,
    operatorId?: number | string,
  ): Promise<AssignedSnapshot> {
    const db = await this.initDb();
    const pendingScope = `${scope}:pending`;
    const physicalTypes: Record<string, string> = {
      [MANIFEST_PHYSICAL_ENTITY_TYPE.ROUTES]: 'route',
      [MANIFEST_PHYSICAL_ENTITY_TYPE.WORK_ORDERS]: 'workOrder',
      [MANIFEST_PHYSICAL_ENTITY_TYPE.METERS]: 'meter',
      [MANIFEST_PHYSICAL_ENTITY_TYPE.READINGS]: 'reading',
      [MANIFEST_PHYSICAL_ENTITY_TYPE.READING_ANOMALY]: 'pendingAnomaly',
      [MANIFEST_PHYSICAL_ENTITY_TYPE.WORK_ORDER_NOVELTY]: 'pendingAnomaly',
    };
    for (const change of page.changes ?? []) {
      if (!physicalTypes[change.entityType]) {
        throw new Error(`Unknown manifest entityType: ${change.entityType}`);
      }
    }
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('assigned_snapshots', 'readwrite');
      const store = transaction.objectStore('assigned_snapshots');
      const request = store.get(pendingScope);
      let resultSnapshot: AssignedSnapshot | undefined;
      request.onsuccess = () => {
        const pending = request.result as AssignedSnapshot | undefined;
        const activeRequest = pending ? null : store.get(scope);
        const continueWith = (activeResult?: AssignedSnapshot) => {
          // IndexedDB returns structured clones; clone explicitly for test doubles and
          // to ensure an incomplete page can never mutate the active snapshot in memory.
          const existing = pending
            ? structuredClone(pending)
            : activeResult
              ? structuredClone(activeResult)
              : undefined;
          // Only a snapshot page at the initial cursor replaces active arrays.
          // Incremental pages may legitimately use cursor:null and must preserve them.
          const fresh = page.mode === 'snapshot' && page.cursor === null;
          if (
            !fresh &&
            (!existing ||
              (existing.snapshotVersion !== undefined &&
                (existing.snapshotVersion !== page.snapshotVersion ||
                  (page.cursor !== null && existing.cursor !== page.cursor))))
          ) {
            transaction.abort();
            reject(new Error('Manifest cursor/snapshot conflict'));
            return;
          }
          const snapshot: AssignedSnapshot = fresh
            ? {
                scope: pendingScope,
                operatorId: operatorId ?? null,
                snapshotVersion: page.snapshotVersion,
                manifestProtocolVersion: MANIFEST_PROTOCOL_VERSION,
                periodId: page.periodId,
                cursor: page.nextCursor,
                complete: page.complete,
                routes: [],
                workOrders: [],
                meters: [],
                registeredReadings: [],
                pendingAnomalies: [],
                savedAt: new Date().toISOString(),
              }
            : {
                ...existing!,
                scope: pendingScope,
                cursor: page.nextCursor,
                complete: page.complete,
                workOrders: existing!.workOrders ?? [],
                pendingAnomalies: existing!.pendingAnomalies ?? [],
              };
          const collections: Record<string, any[]> = {
            route: snapshot.routes,
            workOrder: snapshot.workOrders,
            meter: snapshot.meters,
            reading: snapshot.registeredReadings,
            pendingAnomaly: snapshot.pendingAnomalies,
          };
          const fields: Record<string, string> = {
            route: 'rutaId',
            workOrder: 'ordenTrabajoId',
            meter: 'medidorId',
            reading: 'lecturaId',
            pendingAnomaly: 'anomaliaId',
          };
          const physicalTypes: Record<string, string> = {
            [MANIFEST_PHYSICAL_ENTITY_TYPE.ROUTES]: 'route',
            [MANIFEST_PHYSICAL_ENTITY_TYPE.WORK_ORDERS]: 'workOrder',
            [MANIFEST_PHYSICAL_ENTITY_TYPE.METERS]: 'meter',
            [MANIFEST_PHYSICAL_ENTITY_TYPE.READINGS]: 'reading',
            [MANIFEST_PHYSICAL_ENTITY_TYPE.READING_ANOMALY]: 'pendingAnomaly',
            [MANIFEST_PHYSICAL_ENTITY_TYPE.WORK_ORDER_NOVELTY]: 'pendingAnomaly',
          };
          const getEntityId = (type: string, value: any): string => {
            const field = fields[type];
            return String(value[field] ?? value.id ?? value.novedadId ?? value.lecturaAnomaliaId);
          };
          const upsert = (type: string, values: any[] | undefined) => {
            if (!values || !collections[type]) return;
            const field = fields[type];
            for (const value of values) {
              const item = { ...value, [field]: getEntityId(type, value) };
              const index = collections[type].findIndex(
                (current) => getEntityId(type, current) === item[field],
              );
              if (index < 0) collections[type].push(item);
              else collections[type][index] = { ...collections[type][index], ...item };
            }
          };
          upsert('route', this.normalizeManifestCollection(page.routes));
          upsert('workOrder', this.normalizeManifestCollection(page.workOrders));
          upsert('meter', this.normalizeManifestCollection(page.meters));
          upsert('reading', this.normalizeManifestCollection(page.readings));
          upsert('pendingAnomaly', this.normalizeManifestCollection(page.pendingAnomalies));
          for (const change of page.changes ?? []) {
            const type = physicalTypes[change.entityType];
            const collection = type ? collections[type] : undefined;
            const field = type ? fields[type] : undefined;
            if (!collection || !field) {
              transaction.abort();
              reject(new Error(`Unknown manifest entityType: ${change.entityType}`));
              return;
            }
            const index = collection.findIndex(
              (item) => getEntityId(type!, item) === String(change.id),
            );
            if (change.operation === 'DELETE') {
              if (index >= 0) collection.splice(index, 1);
            } else if (change.data) {
              const item = { ...change.data, [field]: String(change.id) };
              if (index < 0) collection.push(item);
              else collection[index] = { ...collection[index], ...item };
            }
          }
          snapshot.savedAt = new Date().toISOString();
          resultSnapshot = snapshot;
          if (page.complete) {
            snapshot.scope = scope;
            store.put(snapshot);
            store.delete(pendingScope);
          } else {
            store.put(snapshot);
          }
        };
        if (activeRequest) {
          activeRequest.onsuccess = () =>
            continueWith(activeRequest.result as AssignedSnapshot | undefined);
          activeRequest.onerror = () => reject(activeRequest.error);
        } else {
          continueWith();
        }
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => {
        if (resultSnapshot) resolve(resultSnapshot);

        //
        else reject(new Error('Manifest snapshot was not persisted'));
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- RUTAS CACHE (snapshot offline) ---

  async saveRoutesCache<T>(scope: string, routes: T[]): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('rutas_cache', 'readwrite');
      const store = transaction.objectStore('rutas_cache');
      store.put({
        scope,
        items: routes,
        savedAt: new Date().toISOString(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getRoutesCache<T>(scope: string): Promise<RoutesCacheResult<T> | null> {
    const db = await this.initDb();
    const hydratedCache = await this.readRoutesCacheRecord<T>(db, scope);
    const snapshot = db.objectStoreNames.contains('assigned_snapshots')
      ? await this.getAssignedSnapshot(scope)
      : null;

    const hydratedItems = hydratedCache?.items ?? [];
    const snapshotRoutes = (snapshot?.routes as T[] | undefined) ?? [];

    if (hydratedItems.length === 0 && snapshotRoutes.length === 0) {
      return null;
    }

    // RULE: rutas_cache is the BASE for rendering and visit order. The manifest snapshot only
    // merges in as a delta/refresh (see mergeHydratedRoutesWithSnapshot); it is never the source.
    return {
      items: mergeHydratedRoutesWithSnapshot(hydratedItems, snapshotRoutes, snapshot?.workOrders),
      savedAt: this.newestSavedAt(hydratedCache?.savedAt, snapshot?.savedAt),
    };
  }

  private readRoutesCacheRecord<T>(
    db: IDBDatabase,
    scope: string,
  ): Promise<RoutesCacheResult<T> | null> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('rutas_cache', 'readonly');
      const store = transaction.objectStore('rutas_cache');
      const request = store.get(scope);
      request.onsuccess = () => {
        const cache = request.result as { items?: T[]; savedAt?: string } | undefined;
        if (!cache || !cache.items || !cache.savedAt) {
          resolve(null);
          return;
        }
        resolve({ items: cache.items, savedAt: cache.savedAt });
      };
      request.onerror = () => reject(request.error);
    });
  }

  private newestSavedAt(hydratedSavedAt?: string, snapshotSavedAt?: string): string {
    if (!hydratedSavedAt) return snapshotSavedAt ?? new Date().toISOString();
    if (!snapshotSavedAt) return hydratedSavedAt;
    return hydratedSavedAt >= snapshotSavedAt ? hydratedSavedAt : snapshotSavedAt;
  }

  // --- NOVEDADES CACHE (lecturas con anomalías, offline) ---

  /**
   * Persiste el caché de novedades por operador. Cada registro se guarda por su `lecturaId`
   * (keyPath del store) con `scope` y `savedAt` embebidos; una nueva descarga reemplaza solo
   * los registros del mismo scope para no acumular lecturas obsoletas.
   */
  async saveNovedadesCache<T>(scope: string, items: T[]): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('novedades_cache', 'readwrite');
      const store = transaction.objectStore('novedades_cache');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const savedAt = new Date().toISOString();
        for (const record of getAllRequest.result ?? []) {
          if (identityOf(record?.scope) === scope && record?.lecturaId != null) {
            store.delete(record.lecturaId);
          }
        }
        for (const item of items) {
          const record = { ...(item as any), scope, savedAt };
          // Solamente se persisten novedades con lectura servidora real.
          if (identityOf(record.lecturaId) === '') continue;
          store.put(record);
        }
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /** Lee el caché de novedades del operador en la forma `{ items, savedAt }` o null si no hay. */
  async getNovedadesCache<T>(scope: string): Promise<RoutesCacheResult<T> | null> {
    const db = await this.initDb();
    return new Promise<RoutesCacheResult<T> | null>((resolve, reject) => {
      const transaction = db.transaction('novedades_cache', 'readonly');
      const store = transaction.objectStore('novedades_cache');
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result ?? [];
        const scoped = records.filter(
          (record: any) => identityOf(record?.scope) === scope,
        ) as any[];
        if (scoped.length === 0) {
          resolve(null);
          return;
        }
        let savedAt = '';
        for (const record of scoped) {
          const at = identityOf(record?.savedAt);
          if (at > savedAt) savedAt = at;
        }
        const items = scoped.map((record) => {
          const item = { ...record };
          delete item['scope'];
          delete item['savedAt'];
          return item;
        }) as T[];
        resolve({ items, savedAt });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAssignedWorkOrders(scope?: string): Promise<any[]> {
    const db = await this.initDb();
    const fromRoutes = await this.extractWorkOrdersFromRoutes(scope);
    const snapshot =
      scope && db.objectStoreNames.contains('assigned_snapshots')
        ? await this.getAssignedSnapshot(scope)
        : null;
    // Same merge rule as routes: the hydrated cache is the base (visit order), the manifest
    // work-orders collection merges in as a delta without re-sequencing known orders.
    return mergeWorkOrdersWithSnapshot(fromRoutes, snapshot?.workOrders);
  }

  private async extractWorkOrdersFromRoutes(scope?: string): Promise<any[]> {
    if (!scope) return [];
    const routesData = await this.getRoutesCache<any>(scope);
    const extracted: any[] = [];
    const seenIds = new Set<string>();
    for (const r of routesData?.items ?? []) {
      if (r.ordenesTrabajo && Array.isArray(r.ordenesTrabajo)) {
        for (const ot of r.ordenesTrabajo) {
          const id = identityOf(ot.ordenTrabajoId ?? ot.id);
          if (!id) {
            extracted.push(ot);
          } else if (!seenIds.has(id)) {
            seenIds.add(id);
            extracted.push(ot);
          }
        }
      } else if (r.paradas && Array.isArray(r.paradas)) {
        for (const p of r.paradas) {
          const ot = p.ordenTrabajo ?? p;
          const id = identityOf(ot.ordenTrabajoId ?? ot.id);
          if (!id) {
            extracted.push(ot);
          } else if (!seenIds.has(id)) {
            seenIds.add(id);
            extracted.push(ot);
          }
        }
      }
    }
    return extracted;
  }

  async clearPendingAnomalies(): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('anomalias_pendientes', 'readwrite');
      const store = transaction.objectStore('anomalias_pendientes');
      store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
