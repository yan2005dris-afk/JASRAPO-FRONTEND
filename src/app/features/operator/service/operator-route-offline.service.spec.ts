import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import type { OperatorRouteResponse } from '../models/operator.models';
import { OperatorRouteOfflineService } from './operator-route-offline.service';
import { OperatorService } from './operator.service';

const route: OperatorRouteResponse = {
  rutaId: 'route-1',
  tipoRuta: 'TOMA_LECTURA',
  nombre: 'Ruta Centro',
  estado: 'PENDIENTE',
  orden: 1,
  operarioId: 7,
  comunidadId: 3,
  medidor: null,
  operario: { usuarioId: 7, nombres: 'Ana', apellidos: 'Lopez' },
};

describe('OperatorRouteOfflineService', () => {
  let service: OperatorRouteOfflineService;
  let isOnline: ReturnType<typeof vi.fn>;
  let getRoutes: ReturnType<typeof vi.fn>;
  let saveRoutesCache: ReturnType<typeof vi.fn>;
  let getRoutesCache: ReturnType<typeof vi.fn>;
  let currentUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isOnline = vi.fn();
    getRoutes = vi.fn();
    saveRoutesCache = vi.fn().mockResolvedValue(undefined);
    getRoutesCache = vi.fn();
    currentUser = vi.fn().mockReturnValue({ id: '7' });

    TestBed.configureTestingModule({
      providers: [
        OperatorRouteOfflineService,
        { provide: AuthService, useValue: { currentUser } },
        { provide: OperatorService, useValue: { getRoutes } },
        { provide: IndexedDbService, useValue: { saveRoutesCache, getRoutesCache } },
        { provide: NetworkService, useValue: { isOnline } },
      ],
    });

    service = TestBed.inject(OperatorRouteOfflineService);
  });

  it('stores and returns the latest routes while online', async () => {
    isOnline.mockReturnValue(true);
    getRoutes.mockReturnValue(of([route]));

    const result = await service.loadAssignedRoutes();

    expect(getRoutes).toHaveBeenCalledOnce();
    expect(saveRoutesCache).toHaveBeenCalledWith('operator:7', [route]);
    expect(result).toEqual({ routes: [route], source: 'network', cachedAt: null });
  });

  it('keeps the fresh network response when IndexedDB cannot persist it', async () => {
    isOnline.mockReturnValue(true);
    getRoutes.mockReturnValue(of([route]));
    saveRoutesCache.mockRejectedValue(new Error('storage unavailable'));

    const result = await service.loadAssignedRoutes();

    expect(result.source).toBe('network');
    expect(result.routes).toEqual([route]);
    expect(getRoutesCache).not.toHaveBeenCalled();
  });

  it('uses the saved snapshot without calling the API while offline', async () => {
    isOnline.mockReturnValue(false);
    getRoutesCache.mockResolvedValue({ items: [route], savedAt: '2026-08-25T12:00:00.000Z' });

    const result = await service.loadAssignedRoutes();

    expect(getRoutes).not.toHaveBeenCalled();
    expect(getRoutesCache).toHaveBeenCalledWith('operator:7');
    expect(result.source).toBe('cache');
    expect(result.routes).toEqual([route]);
  });

  it('falls back to the saved snapshot when the API fails', async () => {
    isOnline.mockReturnValue(true);
    getRoutes.mockReturnValue(throwError(() => new Error('network unavailable')));
    getRoutesCache.mockResolvedValue({ items: [route], savedAt: '2026-08-25T12:00:00.000Z' });

    const result = await service.loadAssignedRoutes();

    expect(result.source).toBe('cache');
    expect(result.routes).toEqual([route]);
  });

  it('reports that no offline routes are available on a first offline visit', async () => {
    isOnline.mockReturnValue(false);
    getRoutesCache.mockResolvedValue(null);

    await expect(service.loadAssignedRoutes()).rejects.toThrow(
      'No hay rutas guardadas para usar sin conexion.',
    );
  });

  it('does not read another operator cache when the current user is unavailable', async () => {
    currentUser.mockReturnValue(null);

    await expect(service.loadAssignedRoutes()).rejects.toThrow(
      'No se pudo identificar al operador para cargar sus rutas.',
    );
    expect(getRoutesCache).not.toHaveBeenCalled();
  });
});
