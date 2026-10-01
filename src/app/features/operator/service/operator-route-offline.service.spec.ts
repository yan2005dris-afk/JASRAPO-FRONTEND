import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import type { OperatorRouteResponse } from '../models/operator.models';
import {
  classifyRouteLoadError,
  OperatorRouteOfflineService,
} from './operator-route-offline.service';
import { OperatorService } from './operator.service';

const route: OperatorRouteResponse = {
  rutaId: 'route-1',
  tipoRuta: 'LECTURA',
  nombre: 'Ruta Centro',
  estado: 'PENDIENTE',
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
  let getActivityTypes: ReturnType<typeof vi.fn>;
  let saveActivityTypesCache: ReturnType<typeof vi.fn>;
  let getActivityTypesCache: ReturnType<typeof vi.fn>;
  let currentUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isOnline = vi.fn();
    getRoutes = vi.fn();
    saveRoutesCache = vi.fn().mockResolvedValue(undefined);
    getRoutesCache = vi.fn();
    getActivityTypes = vi.fn().mockReturnValue(of([]));
    saveActivityTypesCache = vi.fn().mockResolvedValue(undefined);
    getActivityTypesCache = vi.fn().mockResolvedValue({ items: [] });
    currentUser = vi.fn().mockReturnValue({ id: '7' });

    TestBed.configureTestingModule({
      providers: [
        OperatorRouteOfflineService,
        { provide: AuthService, useValue: { currentUser } },
        { provide: OperatorService, useValue: { getRoutes, getActivityTypes } },
        {
          provide: IndexedDbService,
          useValue: {
            saveRoutesCache,
            getRoutesCache,
            saveActivityTypesCache,
            getActivityTypesCache,
          },
        },
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
    expect(result).toEqual({
      routes: [route],
      source: 'network',
      cachedAt: null,
      error: null,
    });
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

  it('does not mask authorization failures with a cached snapshot', async () => {
    isOnline.mockReturnValue(true);
    getRoutes.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    getRoutesCache.mockResolvedValue({ items: [route], savedAt: '2026-08-25T12:00:00.000Z' });

    await expect(service.loadAssignedRoutes()).rejects.toMatchObject({ status: 403 });
    expect(getRoutesCache).not.toHaveBeenCalled();
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

  it('classifies a 404 period-closed response as a business error, not a network failure', async () => {
    isOnline.mockReturnValue(true);
    getRoutes.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 404, error: { message: 'No hay periodo ABIERTO' } }),
      ),
    );
    getRoutesCache.mockResolvedValue({
      items: [route],
      savedAt: '2026-08-25T12:00:00.000Z',
    });

    const result = await service.loadAssignedRoutes();

    expect(result.source).toBe('cache');
    expect(result.error?.kind).toBe('business');
    expect(result.error?.status).toBe(404);
    expect(result.error?.retryable).toBe(true);
    expect(result.error?.message).toContain('periodo');
  });

  it('throws a business OperatorRouteLoadError when a 404 occurs and there is no cache', async () => {
    isOnline.mockReturnValue(true);
    getRoutes.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    getRoutesCache.mockResolvedValue(null);

    await expect(service.loadAssignedRoutes()).rejects.toMatchObject({
      name: 'OperatorRouteLoadError',
      status: 404,
      info: { kind: 'business', retryable: true },
    });
  });

  it('reports a server error while online and a cache fallback as a business error', async () => {
    isOnline.mockReturnValue(true);
    getRoutes.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    getRoutesCache.mockResolvedValue({
      items: [route],
      savedAt: '2026-08-25T12:00:00.000Z',
    });

    const result = await service.loadAssignedRoutes();

    expect(result.source).toBe('cache');
    expect(result.error?.kind).toBe('business');
  });

  it('reports a status 0 failure (offline/network while online) without masking it as fresh data', async () => {
    isOnline.mockReturnValue(true);
    getRoutes.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    getRoutesCache.mockResolvedValue({
      items: [route],
      savedAt: '2026-08-25T12:00:00.000Z',
    });

    const result = await service.loadAssignedRoutes();

    expect(result.source).toBe('cache');
    expect(result.error?.kind).toBe('network');
    expect(result.error?.retryable).toBe(true);
  });

  it('does not attach an error when genuinely offline with cached data', async () => {
    isOnline.mockReturnValue(false);
    getRoutesCache.mockResolvedValue({
      items: [route],
      savedAt: '2026-08-25T12:00:00.000Z',
    });

    const result = await service.loadAssignedRoutes();

    expect(result.source).toBe('cache');
    expect(result.error).toBeNull();
  });
});

describe('classifyRouteLoadError', () => {
  it('maps 401/403 to auth (non retryable)', () => {
    const info = classifyRouteLoadError(new HttpErrorResponse({ status: 401 }));
    expect(info.kind).toBe('auth');
    expect(info.retryable).toBe(false);
  });

  it('maps any 4xx/5xx server response to business', () => {
    expect(classifyRouteLoadError(new HttpErrorResponse({ status: 400 })).kind).toBe('business');
    expect(classifyRouteLoadError(new HttpErrorResponse({ status: 409 })).kind).toBe('business');
    expect(classifyRouteLoadError(new HttpErrorResponse({ status: 500 })).kind).toBe('business');
  });

  it('keeps the server message for business errors when present', () => {
    const info = classifyRouteLoadError(
      new HttpErrorResponse({ status: 404, error: { message: 'No hay periodo ABIERTO' } }),
    );
    expect(info.message).toBe('No hay periodo ABIERTO');
  });

  it('maps status 0 and non-HTTP errors to network', () => {
    expect(classifyRouteLoadError(new HttpErrorResponse({ status: 0 })).kind).toBe('network');
    expect(classifyRouteLoadError(new Error('Failed to fetch')).kind).toBe('network');
  });
});
