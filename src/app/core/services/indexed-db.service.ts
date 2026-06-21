/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';

export type SyncState = 'PENDIENTE_SYNC' | 'RECHAZADA';

export interface PendingRecord {
  id?: number;
  syncState: SyncState;
  errorMessage: string | null;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  private readonly dbName = 'jasrapo-operator-db';
  private readonly dbVersion = 6;
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

      // Limpiar datos antiguos
      store.clear();

      for (const meter of meters) {
        // Asegurarse de mapear/guardar como número o string según el ID
        store.put(meter);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getMetersCache(): Promise<any[]> {
    const db = await this.initDb();
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

  async getRegisteredReadingsCache(): Promise<any[]> {
    const db = await this.initDb();
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
}
