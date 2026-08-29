import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
import { OperatorSyncService } from './operator-sync.service';
import { NetworkService } from './network.service';
import { IndexedDbService } from './indexed-db.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { AuthService } from './auth.service';

// 1x1 PNG rojo en base64 — foto de prueba mínima y válida para dataURItoBlob.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const VALID_DATA_URI = `data:image/png;base64,${TINY_PNG_BASE64}`;
const INVALID_DATA_URI = 'data:image/png;base64'; // sin coma → split length < 2

describe('OperatorSyncService', () => {
  let service: OperatorSyncService;

  // Mocks
  let isOnline: ReturnType<typeof vi.fn>;
  let connectedSubject: Subject<void>;
  let httpPost: ReturnType<typeof vi.fn>;
  let httpPatch: ReturnType<typeof vi.fn>;
  let httpGet: ReturnType<typeof vi.fn>;
  let savePendingReading: ReturnType<typeof vi.fn>;
  let savePendingAnomaly: ReturnType<typeof vi.fn>;
  let saveSyncedReading: ReturnType<typeof vi.fn>;
  let getPendingReadings: ReturnType<typeof vi.fn>;
  let getPendingAnomalies: ReturnType<typeof vi.fn>;
  let getPendingReadingsByState: ReturnType<typeof vi.fn>;
  let getPendingAnomaliesByState: ReturnType<typeof vi.fn>;
  let updatePendingReading: ReturnType<typeof vi.fn>;
  let deletePendingReading: ReturnType<typeof vi.fn>;
  let updatePendingAnomaly: ReturnType<typeof vi.fn>;
  let deletePendingAnomaly: ReturnType<typeof vi.fn>;
  let saveEstadosCache: ReturnType<typeof vi.fn>;
  let getEstadosCache: ReturnType<typeof vi.fn>;
  let saveCompleteAssignedSnapshot: ReturnType<typeof vi.fn>;
  let currentUserSignal: { id?: string; name?: string } | null;
  let toast: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const buildTestBed = () => {
    // localStorage/sessionStorage no están garantizados en el test environment de
    // Angular unit-test; los re-stubeamos por si el setup global fue limpiado.
    if (typeof localStorage === 'undefined' || !localStorage.getItem) {
      const store = new Map<string, string>();
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      });
    }
    if (typeof sessionStorage === 'undefined' || !sessionStorage.getItem) {
      const store = new Map<string, string>();
      vi.stubGlobal('sessionStorage', {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      });
    }
    TestBed.configureTestingModule({
      providers: [
        OperatorSyncService,
        {
          provide: NetworkService,
          useValue: { isOnline, connected$: connectedSubject.asObservable() },
        },
        {
          provide: IndexedDbService,
          useValue: {
            savePendingReading,
            savePendingAnomaly,
            saveSyncedReading,
            getPendingReadings,
            getPendingAnomalies,
            getPendingReadingsByState,
            getPendingAnomaliesByState,
            updatePendingReading,
            deletePendingReading,
            updatePendingAnomaly,
            deletePendingAnomaly,
            saveEstadosCache,
            getEstadosCache,
            saveCompleteAssignedSnapshot,
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => currentUserSignal,
          },
        },
        { provide: ToastService, useValue: toast },
        { provide: HttpClient, useValue: { post: httpPost, patch: httpPatch, get: httpGet } },
      ],
    });
  };

  beforeEach(() => {
    isOnline = vi.fn();
    connectedSubject = new Subject<void>();

    httpPost = vi.fn();
    httpPatch = vi.fn();
    httpGet = vi.fn();

    savePendingReading = vi.fn().mockResolvedValue(1);
    savePendingAnomaly = vi.fn().mockResolvedValue(1);
    saveSyncedReading = vi.fn().mockResolvedValue(undefined);
    getPendingReadings = vi.fn().mockResolvedValue([]);
    getPendingAnomalies = vi.fn().mockResolvedValue([]);
    getPendingReadingsByState = vi.fn().mockResolvedValue([]);
    getPendingAnomaliesByState = vi.fn().mockResolvedValue([]);
    updatePendingReading = vi.fn().mockResolvedValue(undefined);
    deletePendingReading = vi.fn().mockResolvedValue(undefined);
    updatePendingAnomaly = vi.fn().mockResolvedValue(undefined);
    deletePendingAnomaly = vi.fn().mockResolvedValue(undefined);
    saveEstadosCache = vi.fn().mockResolvedValue(undefined);
    getEstadosCache = vi.fn().mockResolvedValue(null);
    saveCompleteAssignedSnapshot = vi.fn().mockResolvedValue(undefined);
    currentUserSignal = { id: '42', name: 'Operador Test' };

    toast = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    };

    buildTestBed();
    service = TestBed.inject(OperatorSyncService);
  });

  // Helper: extrae los campos del FormData para asserts.
  const formDataToObject = (fd: FormData): Record<string, FormDataEntryValue[]> => {
    const out: Record<string, FormDataEntryValue[]> = {};
    fd.forEach((value, key) => {
      (out[key] ??= []).push(value);
    });
    return out;
  };

  const makeHttpError = (status: number, message: string): HttpErrorResponse =>
    new HttpErrorResponse({ status, error: { message }, headers: new HttpHeaders() });

  // ── submitReading (online) ────────────────────────────────────────────────

  describe('submitReading (online)', () => {
    beforeEach(() => {
      isOnline.mockReturnValue(true);
    });

    it('sin _lecturaId rechaza la lectura y no hace ninguna petición', async () => {
      await expect(service.submitReading({ medidorId: 1, lecturaActual: '123' })).rejects.toThrow(
        /falta _lecturaId/,
      );
      expect(httpPost).not.toHaveBeenCalled();
      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('sin _lecturaId y con foto rechaza sin hacer ninguna petición', async () => {
      await expect(
        service.submitReading({ medidorId: 1, lecturaActual: '123', fotoBase64: VALID_DATA_URI }),
      ).rejects.toThrow(/falta _lecturaId/);
      expect(httpPost).not.toHaveBeenCalled();
      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('PATCH con foto: envía archivo bajo "foto" (no "file")', async () => {
      httpPatch.mockReturnValue(of({ id: 1, lecturaActual: '150' }));
      const reading = {
        _lecturaId: 1,
        medidorId: 1,
        lecturaActual: '150',
        fotoBase64: VALID_DATA_URI,
      };

      await service.submitReading(reading);

      expect(httpPatch).toHaveBeenCalledOnce();
      expect(httpPost).not.toHaveBeenCalled();
      const [url, formData] = httpPatch.mock.calls[0];
      expect(url).toContain('/operator/readings/1');
      const fields = formDataToObject(formData as FormData);
      expect(fields['foto']).toHaveLength(1);
      expect(fields['foto'][0]).toBeInstanceOf(Blob);
      expect(fields['file']).toBeUndefined();
    });

    it('PATCH sin foto: no agrega archivo al FormData', async () => {
      httpPatch.mockReturnValue(of({ id: 1 }));
      await service.submitReading({ _lecturaId: 1, lecturaActual: '150' });

      const [, formData] = httpPatch.mock.calls[0];
      const fields = formDataToObject(formData as FormData);
      expect(fields['file']).toBeUndefined();
      expect(fields['foto']).toBeUndefined();
    });

    it('dataURI inválida o URL remota no lanza ni agrega un archivo', async () => {
      httpPatch.mockReturnValue(of({ id: 1 }));
      await expect(
        service.submitReading({
          _lecturaId: 1,
          medidorId: 1,
          lecturaActual: '1',
          fotoBase64: INVALID_DATA_URI,
        }),
      );
      expect(httpPost).not.toHaveBeenCalled();
    });
  });

  it('prefiere Blob sobre cualquier valor legacy y lo sube como foto', async () => {
    isOnline.mockReturnValue(true);
    httpPatch.mockReturnValue(of({ id: 1 }));
    const blob = new Blob(['photo'], { type: 'image/jpeg' });

    await service.submitReading({
      _lecturaId: 1,
      medidorId: 1,
      lecturaActual: '1',
      fotoBlob: blob,
      fotoBase64: VALID_DATA_URI,
    });

    const fields = formDataToObject(httpPatch.mock.calls[0][1] as FormData);
    expect(fields['foto'][0]).toBeInstanceOf(Blob);
    expect((fields['foto'][0] as Blob).type).toBe('image/jpeg');
  });

  // ── submitReading (offline) ───────────────────────────────────────────────

  describe('submitReading (offline)', () => {
    it('guarda lectura en IndexedDB', async () => {
      isOnline.mockReturnValue(false);
      const reading = {
        _lecturaId: 1,
        medidorId: 1,
        lecturaActual: '150',
        fotoBase64: VALID_DATA_URI,
      };

      const result = await service.submitReading(reading);

      expect(result).toEqual({ offline: true });
      expect(savePendingReading).toHaveBeenCalledWith(reading);
      expect(httpPost).not.toHaveBeenCalled();
      expect(httpPatch).not.toHaveBeenCalled();
    });
  });

  // ── submitWorkOrder ──────────────────────────────────────────────────────

  describe('submitWorkOrder', () => {
    it('usa PATCH con el ID de la orden asignada y foto', async () => {
      isOnline.mockReturnValue(true);
      httpPatch.mockReturnValue(of({ id: 'wo-42' }));

      await service.submitWorkOrder({
        ordenTrabajoId: 'wo-42',
        tipoActividad: 'INSPECCION',
        medidorId: 'meter-1',
        fotoBase64: VALID_DATA_URI,
      });

      expect(httpPatch).toHaveBeenCalledOnce();
      expect(httpPost).not.toHaveBeenCalled();
      const [url, formData] = httpPatch.mock.calls[0];
      expect(url).toContain('/operator/work-orders/wo-42');
      const fields = formDataToObject(formData as FormData);
      expect(fields['foto']).toHaveLength(1);
      expect(fields['file']).toBeUndefined();
    });

    it('encola offline con discriminante y conserva el ID real', async () => {
      isOnline.mockReturnValue(false);
      const workOrder = {
        ordenTrabajoId: 'wo-42',
        tipoActividad: 'INSPECCION',
        medidorId: 'meter-1',
        fotoBase64: VALID_DATA_URI,
      };

      await expect(service.submitWorkOrder(workOrder)).resolves.toEqual({ offline: true });

      expect(savePendingReading).toHaveBeenCalledWith({ ...workOrder, recordType: 'WORK_ORDER' });
      expect(httpPatch).not.toHaveBeenCalled();
      expect(httpPost).not.toHaveBeenCalled();
    });

    it('falla sin ID y no hace ninguna petición', async () => {
      isOnline.mockReturnValue(true);

      await expect(
        service.submitWorkOrder({ tipoActividad: 'INSPECCION', lecturaId: 'reading-99' }),
      ).rejects.toThrow(/falta ordenTrabajoId/);

      expect(httpPatch).not.toHaveBeenCalled();
      expect(httpPost).not.toHaveBeenCalled();
    });
  });

  // ── submitAnomaly ────────────────────────────────────────────────────────

  describe('submitAnomaly', () => {
    it('POST con foto: usa field name "file"', async () => {
      isOnline.mockReturnValue(true);
      httpPost.mockReturnValue(of({ id: 7 }));
      await service.submitAnomaly({
        lecturaId: 1,
        tipo: 'FILTRACION',
        estado: 'PENDIENTE',
        observacion: 'goteo',
        fotoBase64: VALID_DATA_URI,
      });

      const [url, formData] = httpPost.mock.calls[0];
      expect(url).toContain('/reading-anomalies');
      const fields = formDataToObject(formData as FormData);
      expect(fields['lecturaId']).toEqual(['1']);
      expect(fields['tipo']).toEqual(['FILTRACION']);
      expect(fields['estado']).toEqual(['PENDIENTE']);
      expect(fields['observacion']).toEqual(['goteo']);
      expect(fields['file']).toHaveLength(1);
      expect(fields['foto']).toBeUndefined();
    });

    it('offline: guarda en IndexedDB sin llamar backend', async () => {
      isOnline.mockReturnValue(false);
      const anomaly = { lecturaId: 1, tipo: 'FILTRACION', estado: 'PENDIENTE' };

      const result = await service.submitAnomaly(anomaly);

      expect(result).toEqual({ offline: true });
      expect(savePendingAnomaly).toHaveBeenCalledWith(anomaly);
    });
  });

  // ── syncPendingData ──────────────────────────────────────────────────────

  describe('syncPendingData', () => {
    it('error de red (status 0): detiene la cola sin marcar como rechazado', async () => {
      isOnline.mockReturnValue(true);
      getPendingReadingsByState.mockResolvedValue([
        {
          id: 1,
          syncState: 'PENDIENTE_SYNC',
          errorMessage: null,
          _lecturaId: 99,
          lecturaId: 1,
          medidorId: 1,
        },
      ]);
      getPendingAnomaliesByState.mockResolvedValue([]);
      httpPatch.mockReturnValue(throwError(() => makeHttpError(0, 'network down')));

      await service.syncPendingData();

      expect(updatePendingReading).not.toHaveBeenCalled();
      expect(httpPatch).toHaveBeenCalledOnce();
    });

    it('error de validación (400): marca como RECHAZADA y continúa con el resto', async () => {
      isOnline.mockReturnValue(true);
      getPendingReadingsByState.mockResolvedValue([
        {
          id: 1,
          syncState: 'PENDIENTE_SYNC',
          errorMessage: null,
          _lecturaId: 99,
          lecturaId: 1,
          medidorId: 1,
        },
        {
          id: 2,
          syncState: 'PENDIENTE_SYNC',
          errorMessage: null,
          _lecturaId: 100,
          lecturaId: 2,
          medidorId: 2,
        },
      ]);
      getPendingAnomaliesByState.mockResolvedValue([]);
      httpPatch
        .mockReturnValueOnce(throwError(() => makeHttpError(400, 'invalid medidor')))
        .mockReturnValueOnce(of({ id: 100 }));

      await service.syncPendingData();

      expect(updatePendingReading).toHaveBeenCalledWith(1, {
        syncState: 'RECHAZADA',
        errorMessage: 'invalid medidor',
      });
      expect(deletePendingReading).toHaveBeenCalledWith(2);
    });

    it('reproduce una orden offline por PATCH y conserva payload y foto', async () => {
      isOnline.mockReturnValue(true);
      getPendingReadingsByState.mockResolvedValue([
        {
          id: 7,
          syncState: 'PENDIENTE_SYNC',
          errorMessage: null,
          recordType: 'WORK_ORDER',
          ordenTrabajoId: 'wo-42',
          tipoActividad: 'INSPECCION',
          medidorId: 'meter-1',
          estadoSellos: 'INTEGRO',
          hayFugas: false,
          fotoBase64: VALID_DATA_URI,
        },
      ]);
      getPendingAnomaliesByState.mockResolvedValue([]);
      httpPatch.mockReturnValue(of({ id: 'wo-42' }));

      await service.syncPendingData();

      const [url, formData] = httpPatch.mock.calls[0];
      const fields = formDataToObject(formData as FormData);
      expect(url).toContain('/operator/work-orders/wo-42');
      expect(fields['tipoActividad']).toEqual(['INSPECCION']);
      expect(fields['medidorId']).toEqual(['meter-1']);
      expect(fields['estadoSellos']).toEqual(['INTEGRO']);
      expect(fields['hayFugas']).toEqual(['false']);
      expect(fields['foto']).toHaveLength(1);
      expect(httpPost).not.toHaveBeenCalled();
      expect(saveSyncedReading).not.toHaveBeenCalled();
      expect(deletePendingReading).toHaveBeenCalledWith(7);
    });

    it('marca una orden como RECHAZADA ante 400 y continúa con la siguiente', async () => {
      isOnline.mockReturnValue(true);
      getPendingReadingsByState.mockResolvedValue([
        {
          id: 7,
          syncState: 'PENDIENTE_SYNC',
          recordType: 'WORK_ORDER',
          ordenTrabajoId: 'wo-invalid',
          tipoActividad: 'INSPECCION',
        },
        {
          id: 8,
          syncState: 'PENDIENTE_SYNC',
          recordType: 'WORK_ORDER',
          ordenTrabajoId: 'wo-valid',
          tipoActividad: 'INSPECCION',
        },
      ]);
      getPendingAnomaliesByState.mockResolvedValue([]);
      httpPatch
        .mockReturnValueOnce(throwError(() => makeHttpError(400, 'orden no asignada')))
        .mockReturnValueOnce(of({ id: 'wo-valid' }));

      await service.syncPendingData();

      expect(updatePendingReading).toHaveBeenCalledWith(7, {
        syncState: 'RECHAZADA',
        errorMessage: 'orden no asignada',
      });
      expect(deletePendingReading).toHaveBeenCalledWith(8);
      expect(httpPatch).toHaveBeenCalledTimes(2);
    });

    it('conserva una orden pendiente ante error de red y detiene la cola', async () => {
      isOnline.mockReturnValue(true);
      getPendingReadingsByState.mockResolvedValue([
        {
          id: 7,
          syncState: 'PENDIENTE_SYNC',
          recordType: 'WORK_ORDER',
          ordenTrabajoId: 'wo-42',
          tipoActividad: 'INSPECCION',
        },
        {
          id: 8,
          syncState: 'PENDIENTE_SYNC',
          recordType: 'WORK_ORDER',
          ordenTrabajoId: 'wo-43',
          tipoActividad: 'INSPECCION',
        },
      ]);
      getPendingAnomaliesByState.mockResolvedValue([]);
      httpPatch.mockReturnValue(throwError(() => makeHttpError(0, 'network down')));

      await service.syncPendingData();

      expect(updatePendingReading).not.toHaveBeenCalled();
      expect(deletePendingReading).not.toHaveBeenCalled();
      expect(httpPatch).toHaveBeenCalledOnce();
    });

    it('rechaza lectura pendiente sin _lecturaId sin hacer POST y continúa', async () => {
      isOnline.mockReturnValue(true);
      getPendingReadingsByState.mockResolvedValue([
        { id: 3, syncState: 'PENDIENTE_SYNC', medidorId: 1, lecturaActual: '10' },
      ]);
      getPendingAnomaliesByState.mockResolvedValue([]);

      await service.syncPendingData();

      expect(updatePendingReading).toHaveBeenCalledWith(3, {
        syncState: 'RECHAZADA',
        errorMessage: 'No se puede sincronizar la lectura: falta _lecturaId.',
      });
      expect(httpPost).not.toHaveBeenCalled();
      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('PATCH sincronizado usa field name "foto" (asimetría)', async () => {
      isOnline.mockReturnValue(true);
      getPendingReadingsByState.mockResolvedValue([
        {
          id: 1,
          syncState: 'PENDIENTE_SYNC',
          errorMessage: null,
          _lecturaId: 99,
          medidorId: 1,
          lecturaActual: '150',
          fotoBase64: VALID_DATA_URI,
        },
      ]);
      getPendingAnomaliesByState.mockResolvedValue([]);
      httpPatch.mockReturnValue(of({ id: 99 }));

      await service.syncPendingData();

      const [, formData] = httpPatch.mock.calls[0];
      const fields = formDataToObject(formData as FormData);
      expect(fields['foto']).toHaveLength(1);
      expect(fields['file']).toBeUndefined();
    });
  });

  // ── getReadingEstados ────────────────────────────────────────────────────

  describe('getReadingEstados', () => {
    it('usa backend como fuente de verdad y guarda cache para offline', async () => {
      const estados = [{ codigo: 'OK', nombre: 'OK', orden: 1 }];
      httpGet.mockReturnValue(of(estados));

      const result = await service.getReadingEstados();

      expect(result).toEqual(estados);
      expect(saveEstadosCache).toHaveBeenCalledWith(estados);
    });

    it('fallback a cache si backend falla', async () => {
      const cached = [{ codigo: 'OK', nombre: 'OK', orden: 1 }];
      httpGet.mockReturnValue(throwError(() => makeHttpError(500, 'server down')));
      getEstadosCache.mockResolvedValue(cached);

      const result = await service.getReadingEstados();
      expect(result).toEqual(cached);
    });
  });

  // ── downloadAssignedData ─────────────────────────────────────────────────

  describe('downloadAssignedData', () => {
    it('lanza error y toast de advertencia si no hay conexión a internet (offline)', async () => {
      isOnline.mockReturnValue(false);

      await expect(service.downloadAssignedData()).rejects.toThrow('Offline');
      expect(toast.warning).toHaveBeenCalledWith(
        'No tenés conexión a internet para descargar los datos del servidor.',
        'Sin Conexión',
      );
      expect(saveCompleteAssignedSnapshot).not.toHaveBeenCalled();
    });

    it('distingue un 403 de un error offline y conserva el snapshot anterior', async () => {
      isOnline.mockReturnValue(true);
      httpGet.mockImplementation(() => throwError(() => makeHttpError(403, 'Forbidden')));

      await expect(service.downloadAssignedData()).rejects.toBeTruthy();

      expect(service.assignedDataError()).toBe('authorization');
      expect(toast.error).toHaveBeenCalledWith(
        'No tenés autorización para descargar los datos asignados. Verificá tu sesión o permisos.',
        'Acceso no autorizado',
      );
      expect(saveCompleteAssignedSnapshot).not.toHaveBeenCalled();
    });

    it('descarga rutas, medidores, lecturas y estados en paralelo y persiste de forma atómica', async () => {
      isOnline.mockReturnValue(true);

      const mockRoutes = [{ rutaId: 'r-1', nombre: 'Ruta 1' }];
      const mockMeters = [{ medidorId: 101, serie: 'M-101' }];
      const mockReadings = [{ lecturaId: 'lec-1', medidorId: 101 }];
      const mockEstados = [{ codigo: 'OK', nombre: 'OK', orden: 1 }];

      httpGet.mockImplementation((url: string) => {
        if (url.includes('/operator/routes')) return of(mockRoutes);
        if (url.includes('/operator/sync')) return of(mockMeters);
        if (url.includes('/operator/readings')) return of(mockReadings);
        if (url.includes('/readings/estados')) return of(mockEstados);
        return of([]);
      });

      const result = await service.downloadAssignedData();

      expect(result).toEqual({
        routesCount: 1,
        metersCount: 1,
        readingsCount: 1,
      });

      expect(saveCompleteAssignedSnapshot).toHaveBeenCalledWith({
        routes: mockRoutes,
        meters: mockMeters,
        registeredReadings: mockReadings,
        estados: mockEstados,
        scope: 'operator:42',
        operatorId: '42',
      });

      expect(service.lastDownloadTimestamp()).toBeTruthy();
      expect(toast.success).toHaveBeenCalledWith(
        'Datos descargados con éxito: 1 rutas, 1 medidores y 1 lecturas.',
        'Descarga Completada',
      );
    });

    it('no muta IndexedDB si alguna de las llamadas falla a mitad de la descarga (preservando snapshot previo)', async () => {
      isOnline.mockReturnValue(true);

      const mockRoutes = [{ rutaId: 'r-1' }];

      httpGet.mockImplementation((url: string) => {
        if (url.includes('/operator/routes')) return of(mockRoutes);
        if (url.includes('/operator/sync'))
          return throwError(() => makeHttpError(500, 'Error descargando medidores'));
        return of([]);
      });

      await expect(service.downloadAssignedData()).rejects.toBeTruthy();

      expect(saveCompleteAssignedSnapshot).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Error descargando medidores', 'Error de Descarga');
    });

    it('soporta descarga cuando el operador no tiene rutas asignadas', async () => {
      isOnline.mockReturnValue(true);

      httpGet.mockImplementation((url: string) => {
        if (url.includes('/operator/routes')) return of([]);
        if (url.includes('/operator/sync')) return of([]);
        if (url.includes('/operator/readings')) return of([]);
        if (url.includes('/readings/estados')) return of([]);
        return of([]);
      });

      const result = await service.downloadAssignedData();

      expect(result).toEqual({
        routesCount: 0,
        metersCount: 0,
        readingsCount: 0,
      });
      expect(saveCompleteAssignedSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: [],
          meters: [],
          registeredReadings: [],
        }),
      );
    });
  });
});
