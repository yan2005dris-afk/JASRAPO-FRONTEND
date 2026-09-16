/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { TestBed } from '@angular/core/testing';
import { IndexedDbService } from './indexed-db.service';
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
      'lecturas_registradas',
      'lecturas_sincronizadas',
      'estados_cache',
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
                  item.scope ?? item.medidorId ?? item.lecturaId ?? item.tipo ?? item.id ?? item;
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
              clear: () => {
                table.clear();
              },
              delete: (key: any) => {
                table.delete(key);
              },
            };
          },
          abort: vi.fn(),
          oncomplete: null,
          onerror: null,
        };
        setTimeout(() => {
          if (tx.oncomplete) tx.oncomplete();
        }, 10);
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
});
