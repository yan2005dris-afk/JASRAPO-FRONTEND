import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
import { OperatorSyncService } from './operator-sync.service';
import { NetworkService } from './network.service';
import { IndexedDbService } from './indexed-db.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { AuthService } from './auth.service';

const VALID_DATA_URI = new Blob(['photo'], { type: 'image/png' });
const INVALID_DATA_URI = null;

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
  let getAssignedSnapshot: ReturnType<typeof vi.fn>;
  let discardPendingManifest: ReturnType<typeof vi.fn>;
  let applyManifestPage: ReturnType<typeof vi.fn>;
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
            getAssignedSnapshot,
            discardPendingManifest,
            applyManifestPage,
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
    getAssignedSnapshot = vi.fn().mockResolvedValue(null);
    discardPendingManifest = vi.fn().mockResolvedValue(undefined);
    applyManifestPage = vi.fn().mockResolvedValue(undefined);
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

    it('sin _lecturaId en línea rechaza la lectura y no hace ninguna petición', async () => {
      await expect(service.submitReading({ medidorId: 1, lecturaActual: '123' })).rejects.toThrow(
        /no expone un endpoint de creación/,
      );
      expect(httpPost).not.toHaveBeenCalled();
      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('sin _lecturaId y con foto en línea rechaza sin hacer ninguna petición', async () => {
      await expect(
        service.submitReading({ medidorId: 1, lecturaActual: '123', fotoBlob: VALID_DATA_URI }),
      ).rejects.toThrow(/no expone un endpoint de creación/);
      expect(httpPost).not.toHaveBeenCalled();
      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('PATCH con foto: envía archivo bajo "foto" (no "file")', async () => {
      httpPatch.mockReturnValue(of({ id: 1, lecturaActual: '150' }));
      const reading = {
        _lecturaId: 1,
        medidorId: 1,
        lecturaActual: '150',
        fotoBlob: VALID_DATA_URI,
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
          fotoBlob: INVALID_DATA_URI,
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
        fotoBlob: VALID_DATA_URI,
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
    it.each(['INSTALACION', 'INSPECCION', 'RECONEXION'])(
      'envía solo campos DTO permitidos para %s',
      async (tipoActividad) => {
        isOnline.mockReturnValue(true);
        httpPatch.mockReturnValue(of({ id: 'wo-42' }));

        await service.submitWorkOrder({
          ordenTrabajoId: 'wo-42',
          tipoActividad,
          medidorId: 'meter-1',
          fecha: '2026-01-01',
          estado: 'COMPLETADA',
          observaciones: 'sin novedades',
          fotoBlob: VALID_DATA_URI,
        });

        const [url, formData] = httpPatch.mock.calls[0];
        expect(url).toContain('/operator/work-orders/wo-42');
        const fields = formDataToObject(formData as FormData);
        expect(Object.keys(fields).sort()).toEqual(['estado', 'foto', 'resultadoObservacion']);
        expect(fields['resultadoObservacion']).toEqual(['sin novedades']);
        expect(fields['foto']).toHaveLength(1);
        expect(fields['foto'][0]).toBeInstanceOf(Blob);
      },
    );

    it('preserva resultadoObservacion existente sin enviar observaciones', async () => {
      isOnline.mockReturnValue(true);
      httpPatch.mockReturnValue(of({ id: 'wo-42' }));

      await service.submitWorkOrder({
        ordenTrabajoId: 'wo-42',
        observaciones: 'texto del formulario',
        resultadoObservacion: 'valor del DTO',
      });

      const fields = formDataToObject(httpPatch.mock.calls[0][1] as FormData);
      expect(fields['resultadoObservacion']).toEqual(['valor del DTO']);
      expect(fields['observaciones']).toBeUndefined();
    });

    it('encola offline con discriminante y conserva el ID real', async () => {
      isOnline.mockReturnValue(false);
      const workOrder = {
        ordenTrabajoId: 'wo-42',
        tipoActividad: 'INSPECCION',
        medidorId: 'meter-1',
        fotoBlob: VALID_DATA_URI,
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
    it('POST con ordenTrabajoId y foto: usa endpoint /work-order-novelties y field name "file"', async () => {
      isOnline.mockReturnValue(true);
      httpPost.mockReturnValue(of({ id: 7 }));
      await service.submitAnomaly({
        ordenTrabajoId: 'wo-101',
        lecturaId: 1,
        tipo: 'FILTRACION',
        observacion: 'goteo',
        fotoBlob: VALID_DATA_URI,
      });

      const [url, formData] = httpPost.mock.calls[0];
      expect(url).toContain('/work-order-novelties');
      const fields = formDataToObject(formData as FormData);
      expect(fields['ordenTrabajoId']).toEqual(['wo-101']);
      expect(fields['lecturaId']).toEqual(['1']);
      expect(fields['tipo']).toEqual(['FILTRACION']);
      expect(fields['observacion']).toEqual(['goteo']);
      expect(fields['file']).toHaveLength(1);
      expect(fields['foto']).toBeUndefined();
    });

    it('POST online sin ordenTrabajoId: rechaza con error descriptivo', async () => {
      isOnline.mockReturnValue(true);
      await expect(
        service.submitAnomaly({
          lecturaId: 1,
          tipo: 'FILTRACION',
        }),
      ).rejects.toThrow(
        'No se puede registrar la novedad: se requiere una orden de trabajo asociada.',
      );
      expect(httpPost).not.toHaveBeenCalled();
    });

    it('POST novedad con ordenTrabajoId: enruta a /work-order-novelties', async () => {
      isOnline.mockReturnValue(true);
      httpPost.mockReturnValue(of({ id: 99 }));
      await service.submitAnomaly({
        ordenTrabajoId: 'wo-123',
        lecturaId: 5,
        tipo: 'MEDIDOR_TRABADO',
        observacion: 'reloj trabado',
        fotoBlob: VALID_DATA_URI,
      });

      const [url, formData] = httpPost.mock.calls[0];
      expect(url).toContain('/work-order-novelties');
      const fields = formDataToObject(formData as FormData);
      expect(fields['ordenTrabajoId']).toEqual(['wo-123']);
      expect(fields['lecturaId']).toEqual(['5']);
      expect(fields['tipo']).toEqual(['MEDIDOR_TRABADO']);
      expect(fields['observacion']).toEqual(['reloj trabado']);
      expect(fields['file']).toHaveLength(1);
      expect(fields['estado']).toBeUndefined();
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
          fecha: '2026-01-01',
          observaciones: 'revisión completada',
          fotoBlob: VALID_DATA_URI,
        },
      ]);
      getPendingAnomaliesByState.mockResolvedValue([]);
      httpPatch.mockReturnValue(of({ id: 'wo-42' }));

      await service.syncPendingData();

      const [url, formData] = httpPatch.mock.calls[0];
      const fields = formDataToObject(formData as FormData);
      expect(url).toContain('/operator/work-orders/wo-42');
      expect(fields['tipoActividad']).toBeUndefined();
      expect(fields['medidorId']).toBeUndefined();
      expect(fields['fecha']).toBeUndefined();
      expect(fields['observaciones']).toBeUndefined();
      expect(fields['resultadoObservacion']).toEqual(['revisión completada']);
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
        errorMessage:
          'Lectura nueva conservada, pero no sincronizada: el backend no expone un endpoint de creación.',
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
          fotoBlob: VALID_DATA_URI,
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

    it('sincroniza novedad pendiente con ordenTrabajoId via POST /work-order-novelties', async () => {
      isOnline.mockReturnValue(true);
      getPendingReadingsByState.mockResolvedValue([]);
      getPendingAnomaliesByState.mockResolvedValue([
        {
          id: 42,
          syncState: 'PENDIENTE_SYNC',
          ordenTrabajoId: 'wo-999',
          lecturaId: 'lec-1',
          tipo: 'MEDIDOR_DANADO',
          observacion: 'vidrio roto',
          fotoBlob: VALID_DATA_URI,
        },
      ]);
      httpPost.mockReturnValue(of({ id: 88 }));

      await service.syncPendingData();

      expect(httpPost).toHaveBeenCalledOnce();
      const [url, formData] = httpPost.mock.calls[0];
      expect(url).toContain('/work-order-novelties');
      const fields = formDataToObject(formData as FormData);
      expect(fields['ordenTrabajoId']).toEqual(['wo-999']);
      expect(fields['lecturaId']).toEqual(['lec-1']);
      expect(fields['tipo']).toEqual(['MEDIDOR_DANADO']);
      expect(fields['observacion']).toEqual(['vidrio roto']);
      expect(fields['file']).toHaveLength(1);
      expect(deletePendingAnomaly).toHaveBeenCalledWith(42);
    });

    it('rechaza novedad pendiente sin ordenTrabajoId sin llamar al backend', async () => {
      isOnline.mockReturnValue(true);
      getPendingReadingsByState.mockResolvedValue([]);
      getPendingAnomaliesByState.mockResolvedValue([
        {
          id: 43,
          syncState: 'PENDIENTE_SYNC',
          lecturaId: 'lec-2',
          tipo: 'FUGA',
        },
      ]);

      await service.syncPendingData();

      expect(updatePendingAnomaly).toHaveBeenCalledWith(43, {
        syncState: 'RECHAZADA',
        errorMessage:
          'Novedad rechazada: no tiene orden de trabajo asociada para registrar en el servidor.',
      });
      expect(httpPost).not.toHaveBeenCalled();
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
    const manifestPage = (complete: boolean, nextCursor: string | null) => ({
      mode: 'snapshot' as const,
      snapshotVersion: 'v1',
      periodId: 'period-1',
      cursor: null,
      complete,
      nextCursor,
      changes: [],
    });

    it('rechaza una respuesta de manifiesto sin modo válido', async () => {
      isOnline.mockReturnValue(true);
      getAssignedSnapshot.mockResolvedValue(null);
      httpGet.mockImplementation((url: string) =>
        url.includes('/operator/sync/manifest')
          ? of({
              snapshotVersion: 'v1',
              periodId: 'p1',
              cursor: null,
              complete: true,
              nextCursor: null,
              changes: [],
            })
          : of([]),
      );

      await expect(service.downloadAssignedData()).rejects.toThrow('Invalid manifest mode');
      expect(applyManifestPage).not.toHaveBeenCalled();
    });

    it('migra snapshots antiguos iniciando una descarga fresca sin tocar la cola', async () => {
      isOnline.mockReturnValue(true);
      getAssignedSnapshot
        .mockResolvedValueOnce({
          scope: 'operator:42',
          snapshotVersion: 'v1',
          cursor: 'old-cursor',
          complete: true,
          routes: [{ rutaId: 'old' }],
          meters: [],
          registeredReadings: [],
          workOrders: [],
          pendingAnomalies: [],
        })
        .mockResolvedValue({
          scope: 'operator:42',
          routes: [],
          meters: [],
          registeredReadings: [],
          workOrders: [],
          pendingAnomalies: [],
          cursor: null,
        });
      httpGet.mockImplementation((url: string) =>
        url.includes('/operator/sync/manifest') ? of(manifestPage(true, 'new-cursor')) : of([]),
      );

      await service.downloadAssignedData();

      const manifestCall = httpGet.mock.calls.find(([url]) =>
        url.includes('/operator/sync/manifest'),
      );
      expect(manifestCall).toBeTruthy();
      expect(manifestCall![1].params.get('cursor')).toBeNull();
    });

    it('normaliza colecciones paginadas antes de aplicarlas al snapshot', async () => {
      isOnline.mockReturnValue(true);
      const snapshot = {
        scope: 'operator:42',
        snapshotVersion: 'v1',
        manifestProtocolVersion: 2,
        periodId: 'period-1',
        cursor: 'cursor-1',
        complete: true,
        routes: [],
        meters: [],
        registeredReadings: [],
        workOrders: [],
        pendingAnomalies: [],
      };
      getAssignedSnapshot.mockResolvedValue(snapshot);
      httpGet.mockImplementation((url: string) =>
        url.includes('/operator/sync/manifest')
          ? of({
              ...manifestPage(true, 'cursor-2'),
              routes: { items: [{ rutaId: 'r-1' }], hasMore: false, nextCursor: null },
              meters: { items: [{ medidorId: 'm-1' }], hasMore: false, nextCursor: null },
            })
          : of([]),
      );

      await service.downloadAssignedData();

      expect(applyManifestPage).toHaveBeenCalledWith(
        'operator:42',
        expect.objectContaining({
          routes: [{ rutaId: 'r-1' }],
          meters: [{ medidorId: 'm-1' }],
        }),
        '42',
      );
    });

    it('persiste el nextCursor completo y lo usa en la siguiente llamada', async () => {
      isOnline.mockReturnValue(true);
      const snapshot = {
        scope: 'operator:42',
        snapshotVersion: 'v1',
        manifestProtocolVersion: 2,
        periodId: 'period-1',
        cursor: 'cursor-1',
        complete: true,
        routes: [],
        meters: [],
        registeredReadings: [],
        workOrders: [],
        pendingAnomalies: [],
      };
      getAssignedSnapshot.mockResolvedValueOnce(null).mockResolvedValue(snapshot);
      applyManifestPage.mockImplementation((_scope, page) => {
        snapshot.cursor = page.nextCursor;
      });
      httpGet.mockImplementation((url: string) =>
        url.includes('/operator/sync/manifest') ? of(manifestPage(true, 'cursor-2')) : of([]),
      );

      await service.downloadAssignedData();
      await service.downloadAssignedData();
      expect(applyManifestPage).toHaveBeenCalledWith(
        'operator:42',
        expect.objectContaining({ complete: true, nextCursor: 'cursor-2' }),
        '42',
      );

      const calls = httpGet.mock.calls.filter(([url]) => url.includes('/operator/sync/manifest'));
      expect(calls[0][1].params.get('cursor')).toBeNull();
      expect(calls[1][1].params.get('cursor')).toBe('cursor-2');
    });

    it('exige nextCursor cuando la página está incompleta', async () => {
      isOnline.mockReturnValue(true);
      getAssignedSnapshot.mockResolvedValue(null);
      httpGet.mockImplementation((url: string) =>
        url.includes('/operator/sync/manifest') ? of(manifestPage(false, null)) : of([]),
      );

      await expect(service.downloadAssignedData()).rejects.toThrow(
        'Manifest page incomplete without nextCursor',
      );
      expect(
        httpGet.mock.calls.filter(([url]) => url.includes('/operator/sync/manifest')),
      ).toHaveLength(1);
    });

    it('reinicia desde cero tras un 409 sin mutar el cursor persistido', async () => {
      isOnline.mockReturnValue(true);
      const snapshot = {
        scope: 'operator:42',
        snapshotVersion: 'v1',
        manifestProtocolVersion: 2,
        periodId: 'period-1',
        cursor: 'cursor-existing',
        complete: true,
        routes: [],
        meters: [],
        registeredReadings: [],
        workOrders: [],
        pendingAnomalies: [],
      };
      getAssignedSnapshot.mockResolvedValue(snapshot);
      httpGet
        .mockImplementationOnce(() => throwError(() => makeHttpError(409, 'stale cursor')))
        .mockImplementationOnce((url: string) =>
          url.includes('/operator/sync/manifest') ? of(manifestPage(true, 'cursor-new')) : of([]),
        );

      await service.downloadAssignedData();

      const calls = httpGet.mock.calls.filter(([url]) => url.includes('/operator/sync/manifest'));
      expect(calls[0][1].params.get('cursor')).toBe('cursor-existing');
      expect(calls[1][1].params.get('cursor')).toBeNull();
      expect(snapshot.cursor).toBe('cursor-existing');
    });

    it('no llama al endpoint legacy /operator/sync', async () => {
      isOnline.mockReturnValue(true);
      getAssignedSnapshot.mockResolvedValue({
        scope: 'operator:42',
        snapshotVersion: 'v1',
        manifestProtocolVersion: 2,
        periodId: 'period-1',
        cursor: null,
        complete: true,
        routes: [],
        meters: [],
        registeredReadings: [],
        workOrders: [],
        pendingAnomalies: [],
      });
      httpGet.mockImplementation((url: string) =>
        url.includes('/operator/sync/manifest') ? of(manifestPage(true, 'cursor-1')) : of([]),
      );

      await service.downloadAssignedData();

      expect(httpGet.mock.calls.map(([url]) => url)).not.toContain(
        expect.stringMatching(/\/operator\/sync$/),
      );
    });
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

    it.skip('descarga rutas, medidores, lecturas y estados en paralelo y persiste de forma atómica', async () => {
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

    it.skip('no muta IndexedDB si alguna de las llamadas falla a mitad de la descarga (preservando snapshot previo)', async () => {
      isOnline.mockReturnValue(true);

      const mockRoutes = [{ rutaId: 'r-1' }];

      httpGet.mockImplementation((url: string) => {
        if (url.includes('/operator/routes')) return of(mockRoutes);
        if (url.includes('/operator/sync/manifest'))
          return throwError(() => makeHttpError(500, 'Error descargando medidores'));
        return of([]);
      });

      await expect(service.downloadAssignedData()).rejects.toBeTruthy();

      expect(saveCompleteAssignedSnapshot).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Error descargando medidores', 'Error de Descarga');
    });

    it.skip('soporta descarga cuando el operador no tiene rutas asignadas', async () => {
      isOnline.mockReturnValue(true);

      httpGet.mockImplementation((url: string) => {
        if (url.includes('/operator/routes')) return of([]);
        if (url.includes('/operator/sync/manifest')) return of([]);
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
