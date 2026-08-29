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
            };
          },
          abort: vi.fn(),
          oncomplete: null,
          onerror: null,
        };
        setTimeout(() => {
          if (tx.oncomplete) tx.oncomplete();
        }, 0);
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
});
