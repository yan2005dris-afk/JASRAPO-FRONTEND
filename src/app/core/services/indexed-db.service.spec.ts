/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { TestBed } from '@angular/core/testing';
import {
  IndexedDbService,
  mergeHydratedRoutesWithSnapshot,
  mergeWorkOrdersWithSnapshot,
} from './indexed-db.service';
import { vi, beforeEach } from 'vitest';

describe('IndexedDbService - Multi-operator Snapshot Isolation', () => {
  let service: IndexedDbService;
  let inMemoryDb: Map<string, Map<any, any>>;

  const createMockDb = () => {
    inMemoryDb = new Map();
    const storeNames = [
      'assigned_snapshots',
      'rutas_cache',
      'medidores_cache',
      'lecturas_pendientes',
      'anomalias_pendientes',
      'ordenes_pendientes',
      'lecturas_registradas',
      'lecturas_sincronizadas',
      'estados_cache',
      'novedades_cache',
    ];
    for (const name of storeNames) {
      inMemoryDb.set(name, new Map());
    }

    const mockDb: any = {
      objectStoreNames: {
        contains: (name: string) => inMemoryDb.has(name),
      },
      transaction: (stores: string | string[], _mode: string) => {
        const storeList = Array.isArray(stores) ? stores : [stores];
        const tx: any = {
          objectStore: (storeName: string) => {
            const table = inMemoryDb.get(storeName)!;
            return {
              put: (item: any) => {
                const key =
                  item.lecturaId ?? item.medidorId ?? item.scope ?? item.tipo ?? item.id ?? item;
                table.set(key, item);
                return { onsuccess: null, onerror: null };
              },
              add: (item: any) => {
                const id = item.id ?? table.size + 1;
                const stored = { ...item, id };
                table.set(id, stored);
                const req: any = { result: id, onsuccess: null, onerror: null };
                setTimeout(() => req.onsuccess?.(), 0);
                return req;
              },
              get: (key: any) => {
                const req: any = { result: table.get(key) };
                setTimeout(() => {
                  if (req.onsuccess) req.onsuccess();
                }, 0);
                return req;
              },
              getAll: () => {
                const req: any = { result: Array.from(table.values()) };
                setTimeout(() => {
                  if (req.onsuccess) req.onsuccess();
                }, 0);
                return req;
              },
              index: () => ({
                getAll: (state: string) => {
                  const req: any = {
                    result: Array.from(table.values()).filter((v) => v.syncState === state),
                  };
                  setTimeout(() => {
                    if (req.onsuccess) req.onsuccess();
                  }, 0);
                  return req;
                },
              }),
              clear: () => {
                table.clear();
              },
              delete: (key: any) => {
                table.delete(key);
                const req: any = { onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (req.onsuccess) req.onsuccess();
                }, 0);
                return req;
              },
            };
          },
          abort: vi.fn(),
          oncomplete: null,
          onerror: null,
        };
        setTimeout(() => {
          if (tx.oncomplete) tx.oncomplete();
        }, 50);
        return tx;
      },
    };

    return mockDb;
  };

  beforeEach(() => {
    const mockDb = createMockDb();
    vi.stubGlobal('indexedDB', {
      open: () => {
        const req: any = { result: mockDb };
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess();
        }, 0);
        return req;
      },
    });

    TestBed.configureTestingModule({
      providers: [IndexedDbService],
    });
    service = TestBed.inject(IndexedDbService);
  });

  it('debe crearse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('guarda snapshot atómico en assigned_snapshots con scope de operador', async () => {
    const snapshotData = {
      scope: 'operator:101',
      operatorId: '101',
      routes: [{ rutaId: 'r-1', nombre: 'Ruta Norte' }],
      meters: [{ medidorId: 1, serie: 'MTR-001' }],
      registeredReadings: [{ lecturaId: 'lec-1', medidorId: 1 }],
      estados: [{ codigo: 'OK' }],
    };

    await service.saveCompleteAssignedSnapshot(snapshotData);

    const snapshot = await service.getAssignedSnapshot('operator:101');
    expect(snapshot).toBeTruthy();
    expect(snapshot?.operatorId).toBe('101');
    expect(snapshot?.meters).toEqual(snapshotData.meters);
    expect(snapshot?.routes).toEqual(snapshotData.routes);
  });

  it('guarda lecturas y anomalías pendientes con Blob conservando Blob', async () => {
    const blob = new Blob(['photo'], { type: 'image/jpeg' });

    await service.savePendingReading({ _lecturaId: 1, fotoBlob: blob });
    await service.savePendingAnomaly({
      lecturaId: 1,
      fotoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    });

    const reading = (await service.getPendingReadings())[0];
    const anomaly = (await service.getPendingAnomalies())[0];
    expect(reading['fotoBlob']).toBe(blob);
    expect(reading['fotoBlob']).toBeInstanceOf(Blob);
    expect(anomaly['fotoBlob']).toBeInstanceOf(Blob);
  });

  it('conserva varios Blob pendientes sin convertirlos a metadata', async () => {
    await service.savePendingReading({
      _lecturaId: 1,
      fotoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    });
    await service.savePendingReading({
      _lecturaId: 2,
      fotoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    });
    await service.savePendingReading({
      _lecturaId: 3,
      fotoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    });

    const records = await service.getPendingReadings();
    expect(records.every((record) => record['fotoBlob'] instanceof Blob)).toBe(true);
  });

  it('actualiza lecturas y anomalías conservando Blob y sin lanzar con URLs no válidas', async () => {
    const blob = new Blob(['photo'], { type: 'image/jpeg' });
    const readingId = await service.savePendingReading({ _lecturaId: 1, fotoBlob: blob });
    const anomalyId = await service.savePendingAnomaly({ lecturaId: 1, fotoBlob: blob });

    await service.updatePendingReading(readingId, {
      fotoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    });
    await service.updatePendingAnomaly(anomalyId, {
      fotoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    });

    expect((await service.getPendingReadings())[0]['fotoBlob']).toBeInstanceOf(Blob);
    expect((await service.getPendingAnomalies())[0]['fotoBlob']).toBeInstanceOf(Blob);
  });

  it('guarda, filtra por estado, actualiza y elimina órdenes de trabajo pendientes', async () => {
    const id = await service.savePendingWorkOrder({
      ordenTrabajoId: 'wo-1',
      tipoActividad: 'INSPECCION',
      latitud: -0.9677,
      longitud: -80.7089,
    });
    expect(id).toBeGreaterThan(0);

    const all = await service.getPendingWorkOrders();
    expect(all).toHaveLength(1);
    expect(all[0]['ordenTrabajoId']).toBe('wo-1');
    expect(all[0]['syncState']).toBe('PENDIENTE_SYNC');
    expect(all[0]['errorMessage']).toBeNull();

    expect(await service.getPendingWorkOrdersByState('PENDIENTE_SYNC')).toHaveLength(1);

    await service.updatePendingWorkOrder(id, {
      syncState: 'RECHAZADA',
      errorMessage: 'orden no asignada',
    });
    expect(await service.getPendingWorkOrdersByState('PENDIENTE_SYNC')).toHaveLength(0);
    const rejected = await service.getPendingWorkOrdersByState('RECHAZADA');
    expect(rejected).toHaveLength(1);
    expect(rejected[0]['errorMessage']).toBe('orden no asignada');

    await service.deletePendingWorkOrder(id);
    expect(await service.getPendingWorkOrders()).toHaveLength(0);
  });

  it('conserva el Blob de foto en las órdenes de trabajo pendientes', async () => {
    const blob = new Blob(['photo'], { type: 'image/jpeg' });
    await service.savePendingWorkOrder({ ordenTrabajoId: 'wo-2', fotoBlob: blob });

    const orders = await service.getPendingWorkOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0]['fotoBlob']).toBe(blob);
    expect(orders[0]['fotoBlob']).toBeInstanceOf(Blob);
  });

  it('aísla el store de órdenes pendientes del store de lecturas', async () => {
    await service.savePendingReading({ _lecturaId: 1 });
    await service.savePendingWorkOrder({ ordenTrabajoId: 'wo-x' });

    expect(await service.getPendingReadings()).toHaveLength(1);
    expect(await service.getPendingWorkOrders()).toHaveLength(1);
    expect((await service.getPendingWorkOrders())[0]['recordType']).toBeUndefined();
  });

  it('aplica cambios de tablas físicas y tombstones al snapshot', async () => {
    await service.applyManifestPage('operator:1', {
      mode: 'snapshot',
      snapshotVersion: 'v1',
      periodId: 'p1',
      cursor: null,
      complete: true,
      nextCursor: 'c1',
      routes: { items: [{ rutaId: 'r1' }], hasMore: false, nextCursor: null },
      changes: [
        { entityType: 'medidores', id: 'm1', operation: 'CREATE', data: { serie: 'S1' } },
        { entityType: 'lecturas', id: 'l1', operation: 'CREATE', data: { estado: 'OK' } },
        { entityType: 'medidores', id: 'm1', operation: 'DELETE' },
      ],
    } as any);
    const snapshot = await service.getAssignedSnapshot('operator:1');
    expect(snapshot?.routes).toEqual([{ rutaId: 'r1' }]);
    expect(snapshot?.meters).toEqual([]);
    expect(snapshot?.registeredReadings).toEqual([{ estado: 'OK', lecturaId: 'l1' }]);
  });

  it('preserva datos existentes para una página incremental vacía con cursor nulo', async () => {
    await service.saveCompleteAssignedSnapshot({
      scope: 'operator:1',
      routes: [{ rutaId: 'r1' }],
      meters: [{ medidorId: 'm1' }],
      registeredReadings: [{ lecturaId: 'l1' }],
    });

    await service.applyManifestPage('operator:1', {
      mode: 'incremental',
      snapshotVersion: 'v1',
      periodId: 'p1',
      cursor: null,
      complete: true,
      nextCursor: 'c2',
      changes: [],
    });

    const snapshot = await service.getAssignedSnapshot('operator:1');
    expect(snapshot?.routes).toEqual([{ rutaId: 'r1' }]);
    expect(snapshot?.meters).toEqual([{ medidorId: 'm1' }]);
    expect(snapshot?.registeredReadings).toEqual([{ lecturaId: 'l1' }]);
    expect(snapshot?.cursor).toBe('c2');
  });

  it('rechaza entityType desconocido y conserva el snapshot completo anterior', async () => {
    await service.saveCompleteAssignedSnapshot({
      scope: 'operator:1',
      routes: [{ rutaId: 'old' }],
      meters: [],
      registeredReadings: [],
    });
    await expect(
      service.applyManifestPage('operator:1', {
        snapshotVersion: 'v2',
        periodId: 'p1',
        cursor: 'old-cursor',
        complete: true,
        nextCursor: null,
        changes: [{ entityType: 'unknown_table', id: 'x', operation: 'DELETE' }],
      } as any),
    ).rejects.toThrow('Unknown manifest entityType: unknown_table');
    expect((await service.getAssignedSnapshot('operator:1'))?.routes).toEqual([{ rutaId: 'old' }]);
  });

  it('no publica una página incompleta como snapshot activo', async () => {
    await service.saveCompleteAssignedSnapshot({
      scope: 'operator:1',
      routes: [{ rutaId: 'old' }],
      meters: [],
      registeredReadings: [],
    });
    await service.applyManifestPage('operator:1', {
      snapshotVersion: 'v2',
      periodId: 'p1',
      cursor: 'old-cursor',
      complete: false,
      nextCursor: 'next-cursor',
      changes: [],
      routes: { items: [{ rutaId: 'new' }], hasMore: true, nextCursor: 'next-cursor' },
    } as any);
    expect((await service.getAssignedSnapshot('operator:1'))?.routes).toEqual([{ rutaId: 'old' }]);
  });

  it('garantiza aislamiento total entre Operador A y Operador B sin sobreescritura de datos offline', async () => {
    // 1. Operador A descarga sus datos
    const opAData = {
      scope: 'operator:101',
      operatorId: '101',
      routes: [{ rutaId: 'r-A', nombre: 'Ruta de Operador A' }],
      meters: [
        { medidorId: 10, serie: 'M-A-1' },
        { medidorId: 11, serie: 'M-A-2' },
      ],
      registeredReadings: [{ lecturaId: 'lec-A1', medidorId: 10 }],
    };
    await service.saveCompleteAssignedSnapshot(opAData);

    // 2. Operador B descarga sus propios datos en el mismo dispositivo
    const opBData = {
      scope: 'operator:202',
      operatorId: '202',
      routes: [{ rutaId: 'r-B', nombre: 'Ruta de Operador B' }],
      meters: [{ medidorId: 20, serie: 'M-B-1' }],
      registeredReadings: [{ lecturaId: 'lec-B1', medidorId: 20 }],
    };
    await service.saveCompleteAssignedSnapshot(opBData);

    // 3. Verificar que Operador A mantiene intactos sus medidores, rutas y lecturas
    const metersA = await service.getMetersCache('operator:101');
    const routesA = await service.getRoutesCache<any>('operator:101');
    const readingsA = await service.getRegisteredReadingsCache('operator:101');

    expect(metersA).toHaveLength(2);
    expect(metersA.map((m) => m.serie)).toEqual(['M-A-1', 'M-A-2']);
    expect(routesA?.items[0].nombre).toBe('Ruta de Operador A');
    expect(readingsA[0].lecturaId).toBe('lec-A1');

    // 4. Verificar que Operador B tiene sus propios datos aislados
    const metersB = await service.getMetersCache('operator:202');
    const routesB = await service.getRoutesCache<any>('operator:202');
    const readingsB = await service.getRegisteredReadingsCache('operator:202');

    expect(metersB).toHaveLength(1);
    expect(metersB[0].serie).toBe('M-B-1');
    expect(routesB?.items[0].nombre).toBe('Ruta de Operador B');
    expect(readingsB[0].lecturaId).toBe('lec-B1');
  });

  it('getAssignedWorkOrders retorna ordenes desde assigned_snapshots o fallback a rutas_cache', async () => {
    // 1. Snapshot con workOrders explícitas
    await service.saveCompleteAssignedSnapshot({
      scope: 'operator:501',
      workOrders: [
        { id: 'wo-1', tipo: 'INSPECCION' },
        { id: 'wo-2', tipo: 'RECONEXION' },
      ],
    } as any);

    const directOrders = await service.getAssignedWorkOrders('operator:501');
    expect(directOrders).toHaveLength(2);
    expect(directOrders[0].id).toBe('wo-1');

    // 2. Snapshot sin workOrders pero con rutas con paradas / ordenes de trabajo
    await service.saveCompleteAssignedSnapshot({
      scope: 'operator:502',
      routes: [
        {
          paradas: [
            { ordenTrabajo: { id: 'wo-nested-1', numero: 'OT-001' } },
            { ordenTrabajo: { id: 'wo-nested-2', numero: 'OT-002' } },
            { ordenTrabajo: { id: 'wo-nested-1', numero: 'OT-001' } }, // duplicada
          ],
        },
      ],
    } as any);

    const extractedOrders = await service.getAssignedWorkOrders('operator:502');
    expect(extractedOrders).toHaveLength(2);
    expect(extractedOrders.map((o) => o.id)).toEqual(['wo-nested-1', 'wo-nested-2']);
  });

  it('clearPendingAnomalies limpia store anomalias_pendientes', async () => {
    await service.savePendingAnomaly({ tipo: 'FUGA', estado: 'PENDIENTE' });
    const before = await service.getPendingAnomalies();
    expect(before.length).toBeGreaterThan(0);

    await service.clearPendingAnomalies();
    const after = await service.getPendingAnomalies();
    expect(after).toEqual([]);
  });

  it('guarda y recupera el caché de novedades por operador', async () => {
    const items = [
      {
        lecturaId: 'l-1',
        medidorId: 'M-1',
        medidorSerie: 'S-1',
        fecha: '2026-06-15T10:00:00Z',
        estado: 'PROCESADA',
        anomalias: [],
      },
      {
        lecturaId: 'l-2',
        medidorId: 'M-2',
        medidorSerie: 'S-2',
        fecha: '2026-06-16T10:00:00Z',
        estado: 'PENDIENTE',
        anomalias: [],
      },
    ];

    await service.saveNovedadesCache('operator:1', items);
    const result = await service.getNovedadesCache<any>('operator:1');

    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(2);
    expect(result?.items.map((i) => i.lecturaId)).toEqual(['l-1', 'l-2']);
    expect(result?.items[0].medidorSerie).toBe('S-1');
    expect(result?.savedAt).toBeTruthy();
  });

  it('aisla el caché de novedades por operador y reemplaza al descargar de nuevo', async () => {
    await service.saveNovedadesCache('operator:1', [
      {
        lecturaId: 'l-1',
        medidorId: 'M-1',
        medidorSerie: 'S-1',
        fecha: '2026-06-15T10:00:00Z',
        estado: 'PROCESADA',
        anomalias: [],
      },
    ]);
    await service.saveNovedadesCache('operator:2', [
      {
        lecturaId: 'l-9',
        medidorId: 'M-9',
        medidorSerie: 'S-9',
        fecha: '2026-06-17T10:00:00Z',
        estado: 'PENDIENTE',
        anomalias: [],
      },
    ]);

    expect((await service.getNovedadesCache<any>('operator:1'))?.items).toHaveLength(1);
    expect((await service.getNovedadesCache<any>('operator:2'))?.items[0].lecturaId).toBe('l-9');

    // Una nueva descarga para el mismo operador reemplaza las lecturas anteriores.
    await service.saveNovedadesCache('operator:1', [
      {
        lecturaId: 'l-3',
        medidorId: 'M-3',
        medidorSerie: 'S-3',
        fecha: '2026-06-18T10:00:00Z',
        estado: 'PROCESADA',
        anomalias: [],
      },
    ]);
    const refreshed = await service.getNovedadesCache<any>('operator:1');
    expect(refreshed?.items.map((i) => i.lecturaId)).toEqual(['l-3']);
  });

  it('retorna null del caché de novedades si no hay registros para el operador', async () => {
    await service.saveNovedadesCache('operator:7', [
      {
        lecturaId: 'l-7',
        medidorId: 'M-7',
        medidorSerie: 'S-7',
        fecha: '2026-06-15T10:00:00Z',
        estado: 'PROCESADA',
        anomalias: [],
      },
    ]);

    expect(await service.getNovedadesCache<any>('operator:missing')).toBeNull();
  });
});

describe('Route/snapshot cache merge (rutas_cache base, manifest delta)', () => {
  let service: IndexedDbService;

  const createMockDb = () => {
    const tables = new Map<string, Map<any, any>>();
    const storeNames = [
      'assigned_snapshots',
      'rutas_cache',
      'medidores_cache',
      'lecturas_pendientes',
      'anomalias_pendientes',
      'ordenes_pendientes',
      'lecturas_registradas',
      'lecturas_sincronizadas',
      'estados_cache',
      'novedades_cache',
    ];
    for (const name of storeNames) tables.set(name, new Map());

    const mockDb: any = {
      objectStoreNames: { contains: (name: string) => tables.has(name) },
      transaction: (stores: string | string[], _mode: string) => {
        const storeList = Array.isArray(stores) ? stores : [stores];
        const tx: any = {
          objectStore: (storeName: string) => {
            const table = tables.get(storeName)!;
            return {
              put: (item: any) => {
                const key =
                  item.lecturaId ?? item.medidorId ?? item.scope ?? item.tipo ?? item.id ?? item;
                table.set(key, item);
                return { onsuccess: null, onerror: null };
              },
              add: (item: any) => {
                const id = item.id ?? table.size + 1;
                table.set(id, { ...item, id });
                return { result: id, onsuccess: null, onerror: null };
              },
              get: (key: any) => {
                const req: any = { result: table.get(key) };
                setTimeout(() => req.onsuccess?.(), 0);
                return req;
              },
              getAll: () => {
                const req: any = { result: Array.from(table.values()) };
                setTimeout(() => req.onsuccess?.(), 0);
                return req;
              },
              index: () => ({
                getAll: (state: string) => {
                  const req: any = {
                    result: Array.from(table.values()).filter((v) => v.syncState === state),
                  };
                  setTimeout(() => req.onsuccess?.(state), 0);
                  return req;
                },
              }),
              clear: () => table.clear(),
              delete: (key: any) => {
                table.delete(key);
                const req: any = { onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (req.onsuccess) req.onsuccess();
                }, 0);
                return req;
              },
            };
          },
          abort: vi.fn(),
          oncomplete: null,
          onerror: null,
        };
        setTimeout(() => tx.oncomplete?.(), 50);
        return tx;
      },
    };
    return mockDb;
  };

  beforeEach(() => {
    const mockDb = createMockDb();
    vi.stubGlobal('indexedDB', {
      open: () => {
        const req: any = { result: mockDb };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      },
    });
    TestBed.configureTestingModule({ providers: [IndexedDbService] });
    service = TestBed.inject(IndexedDbService);
  });

  it('renders from the hydrated cache and merges the stripped manifest snapshot as a delta', async () => {
    const scope = 'operator:601';
    const hydratedRoutes = [
      {
        rutaId: 'r-hydrated-1',
        nombre: 'Ruta Centro',
        tipoRuta: 'TOMA_LECTURA',
        estado: 'PENDIENTE',
        orden: 1,
        comunidadId: 3,
        paradas: [
          {
            ordenTrabajoId: 'wo-1',
            tipoActividad: 'LECTURA',
            estado: 'PENDIENTE',
            latitud: -1.5,
            longitud: -80.5,
            serie: 'M-1',
            clienteNombre: 'Cliente 1',
          },
        ],
        ordenesTrabajo: [
          {
            ordenTrabajoId: 'wo-1',
            rutaId: 'r-hydrated-1',
            tipoActividad: 'LECTURA',
            estado: 'PENDIENTE',
            ordenVisita: 1,
            medidor: { medidorId: '1', serie: 'M-1', latitud: -1.5, longitud: -80.5 },
          },
        ],
      },
    ];
    await service.saveRoutesCache(scope, hydratedRoutes);

    // Simula "Descargar / Actualizar Datos": el manifest publica rutas STRIPPED (ordenes/paradas []).
    await service.applyManifestPage(scope, {
      mode: 'snapshot',
      snapshotVersion: 'v1',
      periodId: 'p1',
      cursor: null,
      complete: true,
      nextCursor: null,
      routes: {
        items: [
          { rutaId: 'r-hydrated-1', nombre: 'Ruta Centro', tipoRuta: 'TOMA_LECTURA', estado: 'COMPLETADA', orden: 1, comunidadId: 3 },
          { rutaId: 'r-new-2', nombre: 'Ruta Nueva', tipoRuta: 'INSTALACION', estado: 'PENDIENTE', orden: 1, comunidadId: 5 },
        ],
        hasMore: false,
        nextCursor: null,
      },
      workOrders: {
        items: [
          {
            ordenTrabajoId: 'wo-2',
            rutaId: 'r-new-2',
            tipoActividad: 'INSTALACION',
            estado: 'PENDIENTE',
            ordenVisita: 1,
            medidor: { medidorId: '9', serie: 'M-9', latitud: -2.1, longitud: -80.1 },
          },
        ],
        hasMore: false,
        nextCursor: null,
      },
      changes: [],
    } as any);

    const result = (await service.getRoutesCache<any>(scope))!;
    expect(result).not.toBeNull();
    expect(result.items).toHaveLength(2);

    const hydrated = result.items.find((r: any) => r.rutaId === 'r-hydrated-1');
    expect(hydrated.estado).toBe('COMPLETADA'); // estado refrescado desde el snapshot
    expect(hydrated.paradas).toHaveLength(1); // arreglo hidratado conservado
    expect(hydrated.ordenesTrabajo).toHaveLength(1);

    const newRoute = result.items.find((r: any) => r.rutaId === 'r-new-2');
    expect(newRoute).toBeTruthy();
    expect(newRoute.ordenesTrabajo).toHaveLength(1); // re-hidratada desde workOrders del manifest
    expect(newRoute.ordenesTrabajo[0].ordenTrabajoId).toBe('wo-2');
  });

  it('returns only the snapshot routes when no hydrated cache exists (no dropped routes)', async () => {
    const snapshotOnly = [
      { rutaId: 'r-a', nombre: 'Ruta A' },
      { rutaId: 'r-b', nombre: 'Ruta B' },
    ];
    const merged = mergeHydratedRoutesWithSnapshot(undefined, snapshotOnly);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(snapshotOnly[0]);
  });

  it('keeps hydrated entries untouched when the snapshot has no route data at all', async () => {
    const hydrated = [{ rutaId: 'r-a', paradas: [{ latitud: 1 }] }];
    const merged = mergeHydratedRoutesWithSnapshot(hydrated, undefined);
    expect(merged).toEqual(hydrated);
  });

  it('refreshes mutable route state without touching hydrated arrays', () => {
    const hydrated = [
      {
        rutaId: 'r-1',
        estado: 'PENDIENTE',
        orden: 1,
        nombre: 'Ruta Vieja',
        paradas: [{ latitud: -1.5, longitud: -80.5 }],
        ordenesTrabajo: [{ ordenTrabajoId: 'wo-1' }],
      },
    ];
    const snapshot = [
      {
        rutaId: 'r-1',
        estado: 'COMPLETADA',
        orden: 2,
        nombre: 'Ruta Vieja',
        paradas: [], // stripped en el manifest
        ordenesTrabajo: [],
      },
    ];
    const [merged] = mergeHydratedRoutesWithSnapshot(hydrated, snapshot) as any[];
    expect(merged.estado).toBe('COMPLETADA');
    expect(merged.orden).toBe(2);
    expect(merged.paradas).toHaveLength(1);
    expect(merged.ordenesTrabajo).toHaveLength(1);
  });

  it('does not reorder hydrated work orders and refreshes mutable state in place', () => {
    const hydrated = [
      { ordenTrabajoId: 'wo-1', estado: 'PENDIENTE', ordenVisita: 5 },
      { ordenTrabajoId: 'wo-2', estado: 'PENDIENTE', ordenVisita: 2 },
    ];
    const snapshot = [
      { ordenTrabajoId: 'wo-2', estado: 'COMPLETADA' },
      { ordenTrabajoId: 'wo-3', estado: 'PENDIENTE' },
    ];
    const merged = mergeWorkOrdersWithSnapshot(hydrated, snapshot);
    expect(merged.map((wo) => wo.ordenTrabajoId)).toEqual(['wo-1', 'wo-2', 'wo-3']);
    expect(merged[1].estado).toBe('COMPLETADA');
  });

  it('keeps the snapshot work orders when no hydrated orders exist', () => {
    const merged = mergeWorkOrdersWithSnapshot(undefined, [
      { ordenTrabajoId: 'wo-9', estado: 'PENDIENTE' },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].ordenTrabajoId).toBe('wo-9');
  });
});
