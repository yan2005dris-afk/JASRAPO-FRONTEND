import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NetworkService } from './network.service';
import { dataURItoBlob, IndexedDbService } from './indexed-db.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';

type PayloadValue = string | number | boolean | null | undefined;
export interface ReadingSubmission {
  _lecturaId?: string | number;
  fotoBase64?: string | null;
  [key: string]: PayloadValue;
}
export interface WorkOrderSubmission {
  ordenTrabajoId?: string | number;
  fotoBase64?: string | null;
  [key: string]: PayloadValue;
}

@Injectable({
  providedIn: 'root',
})
export class OperatorSyncService {
  private readonly http = inject(HttpClient);
  private readonly networkService = inject(NetworkService);
  private readonly dbService = inject(IndexedDbService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

  private readonly READINGS_API = `${environment.apiUrl}/readings`;
  private readonly OPERATOR_API = `${environment.apiUrl}/operator`;
  private readonly ANOMALIES_API = `${environment.apiUrl}/reading-anomalies`;

  // Signals para rastrear el estado de la cola
  readonly pendingReadingsCount = signal<number>(0);
  readonly pendingAnomaliesCount = signal<number>(0);
  readonly rejectedReadingsCount = signal<number>(0);
  readonly rejectedAnomaliesCount = signal<number>(0);
  readonly isSyncing = signal<boolean>(false);
  readonly isDownloading = signal<boolean>(false);
  /** Resultado de la última carga, para no confundir permisos con offline. */
  readonly assignedDataError = signal<'authorization' | 'offline' | 'network' | null>(null);

  private readonly LAST_DOWNLOAD_KEY = 'jasrapo_operator_last_download';
  readonly lastDownloadTimestamp = signal<string | null>(
    localStorage.getItem(this.LAST_DOWNLOAD_KEY),
  );

  // Total de elementos pendientes (solo pendientes de envío, sin rechazados)
  readonly totalPending = computed(
    () => this.pendingReadingsCount() + this.pendingAnomaliesCount(),
  );

  // Total con problemas (rechazados)
  readonly totalRejected = computed(
    () => this.rejectedReadingsCount() + this.rejectedAnomaliesCount(),
  );

  // Total general en cola (pendientes + rechazados)
  readonly totalQueued = computed(() => this.totalPending() + this.totalRejected());

  private readonly AUTO_SYNC_KEY = 'jasrapo_auto_sync';
  readonly autoSyncEnabled = signal<boolean>(this.loadAutoSyncPreference());

  private loadAutoSyncPreference(): boolean {
    return localStorage.getItem(this.AUTO_SYNC_KEY) !== 'false';
  }

  toggleAutoSync(): void {
    const next = !this.autoSyncEnabled();
    this.autoSyncEnabled.set(next);
    localStorage.setItem(this.AUTO_SYNC_KEY, next.toString());
  }

  private saveLastDownloadDate(): void {
    const iso = new Date().toISOString();
    localStorage.setItem(this.LAST_DOWNLOAD_KEY, iso);
    this.lastDownloadTimestamp.set(iso);
  }

  constructor() {
    this.refreshPendingCounts();
    this.networkService.connected$.subscribe(() => {
      if (this.autoSyncEnabled()) {
        this.syncPendingData();
      }
    });
  }

  private appendPhoto(
    formData: FormData,
    photoBlob?: Blob,
    fotoBase64?: string,
    field = 'foto',
    filename = 'evidencia.jpg',
  ): void {
    if (photoBlob instanceof Blob) {
      formData.append(field, photoBlob, filename);
    } else if (typeof fotoBase64 === 'string' && fotoBase64.startsWith('data:')) {
      try {
        formData.append(field, dataURItoBlob(fotoBase64), filename);
      } catch {
        // Ignore malformed legacy values rather than treating display URLs as files.
      }
    }
  }

  /**
   * Refresca el contador de registros pendientes en IndexedDB
   */
  async refreshPendingCounts(): Promise<void> {
    try {
      const readings = await this.dbService.getPendingReadings();
      const anomalies = await this.dbService.getPendingAnomalies();

      const pendingR = readings.filter((r) => r.syncState === 'PENDIENTE_SYNC');
      const rejectedR = readings.filter((r) => r.syncState === 'RECHAZADA');
      const pendingA = anomalies.filter((a) => a.syncState === 'PENDIENTE_SYNC');
      const rejectedA = anomalies.filter((a) => a.syncState === 'RECHAZADA');

      this.pendingReadingsCount.set(pendingR.length);
      this.rejectedReadingsCount.set(rejectedR.length);
      this.pendingAnomaliesCount.set(pendingA.length);
      this.rejectedAnomaliesCount.set(rejectedA.length);
    } catch (e) {
      console.error('Error al actualizar contadores offline:', e);
    }
  }

  /**
   * Envía una lectura existente al backend o la encola si está offline.
   * El flujo del operador requiere reading._lecturaId y siempre usa PATCH.
   * Wire format: multipart/form-data, con evidencia bajo el campo `foto`.
   */
  async submitReading(
    reading: ReadingSubmission & { fotoBlob?: Blob | null },
  ): Promise<unknown> {
    const { _lecturaId, fotoBlob, fotoBase64, ...payload } = reading;
    const hasId =
      _lecturaId !== null && _lecturaId !== undefined && String(_lecturaId).trim() !== '';
    if (this.networkService.isOnline() && !hasId) {
      throw new Error(
        'No se puede enviar una lectura nueva en línea: el backend no expone un endpoint de creación.',
      );
    }

    if (this.networkService.isOnline()) {
      try {
        const formData = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
        this.appendPhoto(formData, fotoBlob, fotoBase64, 'foto', 'foto.jpg');

        const request$ = this.http.patch<unknown>(
          `${this.OPERATOR_API}/readings/${_lecturaId}`,
          formData,
          {
            withCredentials: true,
          },
        );

        const response = await firstValueFrom(request$);
        await this.dbService.saveSyncedReading({ ...payload, _lecturaId });
        this.toastService.success('Lectura registrada en el servidor correctamente.', 'Éxito');
        return response;
      } catch (error: unknown) {
        this.toastService.error(
          (error as HttpErrorResponse).error?.message || 'Error al enviar lectura al servidor.',
          'Error',
        );
        throw error;
      }
    } else {
      await this.dbService.savePendingReading(reading); // keeps _lecturaId in record
      await this.refreshPendingCounts();
      this.toastService.warning(
        'Modo Offline: Lectura guardada localmente. Se sincronizará al recuperar internet.',
        'Guardado Local',
      );
      return { offline: true };
    }
  }

  /**
   * Envia una anomalía al backend o la encola si está offline
   */
  async submitAnomaly(anomaly: Record<string, unknown>): Promise<unknown> {
    if (this.networkService.isOnline()) {
      try {
        const formData = new FormData();
        formData.append('lecturaId', String(anomaly['lecturaId']));
        formData.append('tipo', String(anomaly['tipo']));
        formData.append('estado', String(anomaly['estado']));
        if (anomaly['observacion']) {
          formData.append('observacion', String(anomaly['observacion']));
        }
        this.appendPhoto(
          formData,
          (anomaly['fotoBlob'] as Blob) || null,
          (anomaly['fotoBase64'] as string) || null,
          'file',
        );

        const response = await firstValueFrom(
          this.http.post<unknown>(this.ANOMALIES_API, formData, { withCredentials: true }),
        );
        this.toastService.success('Novedad/Anomalía registrada en el servidor.', 'Éxito');
        return response;
      } catch (error: unknown) {
        this.toastService.error(
          (error as HttpErrorResponse).error?.message || 'Error al enviar novedad al servidor.',
          'Error',
        );
        throw error;
      }
    } else {
      // Guardar en cola local
      await this.dbService.savePendingAnomaly(anomaly);
      await this.refreshPendingCounts();
      this.toastService.warning(
        'Modo Offline: Novedad guardada localmente. Se sincronizará al recuperar internet.',
        'Guardado Local',
      );
      return { offline: true };
    }
  }

  /**
   * Envia una orden de trabajo (INSTALACION / INSPECCION / RECONEXION) al backend
   * o la encola si está offline. Requiere ticket #261 mergeado para tener endpoint real.
   *
   * Field name del archivo: 'foto' (consistente con PATCH /operator/readings/:id).
   * El contrato completo (campo por tipo de actividad, validaciones server-side) se
   * documenta en Shortcut #261.
   */
  async submitWorkOrder(
    workOrder: WorkOrderSubmission & { fotoBlob?: Blob | null },
  ): Promise<unknown> {
    const { ordenTrabajoId, fotoBlob, fotoBase64, ...payload } = workOrder;
    if (
      ordenTrabajoId === null ||
      ordenTrabajoId === undefined ||
      String(ordenTrabajoId).trim() === ''
    ) {
      throw new Error('No se puede enviar la orden de trabajo: falta ordenTrabajoId.');
    }

    if (this.networkService.isOnline()) {
      try {
        const formData = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
        this.appendPhoto(formData, fotoBlob, fotoBase64);

        const url = `${this.OPERATOR_API}/work-orders/${ordenTrabajoId}`;
        const request$ = this.http.patch<unknown>(url, formData, { withCredentials: true });

        const response = await firstValueFrom(request$);
        this.toastService.success('Orden de trabajo registrada correctamente.', 'Éxito');
        return response;
      } catch (error: unknown) {
        this.toastService.error(
          (error as HttpErrorResponse).error?.message || 'Error al enviar orden al servidor.',
          'Error',
        );
        throw error;
      }
    } else {
      // TODO (#267): encolar en nuevo store `ordenes_pendientes` cuando exista.
      // Mientras tanto, guardamos en el store legacy de lecturas para no perder el dato.
      await this.dbService.savePendingReading({ ...workOrder, recordType: 'WORK_ORDER' });
      await this.refreshPendingCounts();
      this.toastService.warning(
        'Modo Offline: Orden guardada localmente. Se sincronizará al recuperar internet.',
        'Guardado Local',
      );
      return { offline: true };
    }
  }

  /**
   * Determina si un error HTTP es de validación del servidor (4xx) o de red/infraestructura.
   * Errores de red: status 0, 502, 503, 504 o sin status.
   */
  private isValidationError(error: HttpErrorResponse): boolean {
    return error.status >= 400 && error.status < 500;
  }

  /**
   * Extrae el mensaje de error legible del backend
   */
  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return typeof error.error.message === 'string'
        ? error.error.message
        : JSON.stringify(error.error.message);
    }
    return `Error del servidor (${error.status})`;
  }

  /**
   * Ejecuta el proceso de sincronización en segundo plano de todos los datos encolados.
   * - Errores de RED: detiene la cola (sin internet / timeout).
   * - Errores de VALIDACIÓN (400-499): marca el registro como RECHAZADA con mensaje y continúa.
   */
  async syncPendingData(): Promise<void> {
    if (this.isSyncing() || !this.networkService.isOnline()) return;

    const readings = await this.dbService.getPendingReadingsByState('PENDIENTE_SYNC');
    const anomalies = await this.dbService.getPendingAnomaliesByState('PENDIENTE_SYNC');

    if (readings.length === 0 && anomalies.length === 0) return;

    this.isSyncing.set(true);
    this.toastService.info(
      'Iniciando sincronización de registros guardados offline...',
      'Sincronizando',
    );

    let successReadingsCount = 0;
    let successWorkOrdersCount = 0;
    let successAnomaliesCount = 0;
    let rejectedCount = 0;

    // 1. Sincronizar primero las lecturas encoladas
    for (const pending of readings) {
      if (pending['recordType'] === 'WORK_ORDER') {
        try {
          const {
            id,
            syncState: _syncState, // eslint-disable-line @typescript-eslint/no-unused-vars
            errorMessage: _errorMessage, // eslint-disable-line @typescript-eslint/no-unused-vars
            recordType: _recordType, // eslint-disable-line @typescript-eslint/no-unused-vars
            ordenTrabajoId,
            fotoBlob,
            fotoBase64,
            ...workOrderPayload
          } = pending;
          const formData = new FormData();
          for (const [key, value] of Object.entries(workOrderPayload)) {
            if (value !== null && value !== undefined) formData.append(key, String(value));
          }
          this.appendPhoto(formData, fotoBlob, fotoBase64);
          await firstValueFrom(
            this.http.patch<unknown>(
              `${this.OPERATOR_API}/work-orders/${ordenTrabajoId}`,
              formData,
              {
                withCredentials: true,
              },
            ),
          );
          await this.dbService.deletePendingReading(id!);
          successWorkOrdersCount++;
        } catch (error) {
          const httpError = error as HttpErrorResponse;
          if (this.isValidationError(httpError)) {
            await this.dbService.updatePendingReading(pending.id!, {
              syncState: 'RECHAZADA',
              errorMessage: this.extractErrorMessage(httpError),
            });
            rejectedCount++;
          } else {
            console.error('Error de red al sincronizar orden, deteniendo cola:', error);
            break;
          }
        }
        continue;
      }
      try {
        const {
          id,
          syncState: _syncState, // eslint-disable-line @typescript-eslint/no-unused-vars
          errorMessage: _errorMessage, // eslint-disable-line @typescript-eslint/no-unused-vars
          _lecturaId,
          fotoBlob,
          fotoBase64,
          ...payload
        } = pending;

        const formData = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
        this.appendPhoto(formData, fotoBlob, fotoBase64, 'foto', 'foto.jpg');

        if (_lecturaId === null || _lecturaId === undefined || String(_lecturaId).trim() === '') {
          await this.dbService.updatePendingReading(pending.id!, {
            syncState: 'RECHAZADA',
            errorMessage:
              'Lectura nueva conservada, pero no sincronizada: el backend no expone un endpoint de creación.',
          });
          rejectedCount++;
          continue;
        }
        await firstValueFrom(
          this.http.patch<unknown>(`${this.OPERATOR_API}/readings/${_lecturaId}`, formData, {
            withCredentials: true,
          }),
        );
        await this.dbService.saveSyncedReading({ ...payload, _lecturaId });
        await this.dbService.deletePendingReading(id!);
        successReadingsCount++;
      } catch (error) {
        const httpError = error as HttpErrorResponse;
        if (this.isValidationError(httpError)) {
          // Error de validación: marcar como rechazada y CONTINUAR con la cola
          await this.dbService.updatePendingReading(pending.id!, {
            syncState: 'RECHAZADA',
            errorMessage: this.extractErrorMessage(httpError),
          });
          rejectedCount++;
        } else {
          // Error de red: parar la cola
          console.error('Error de red al sincronizar lectura, deteniendo cola:', error);
          break;
        }
      }
    }

    // Actualizar contadores parciales
    await this.refreshPendingCounts();

    // 2. Sincronizar las anomalías
    for (const pending of anomalies) {
      try {
        const {
          id,
          syncState: _syncState2, // eslint-disable-line @typescript-eslint/no-unused-vars
          errorMessage: _errorMessage2, // eslint-disable-line @typescript-eslint/no-unused-vars
          fotoBlob,
          fotoBase64,
          ...payload
        } = pending;

        const formData = new FormData();
        formData.append('lecturaId', String(payload['lecturaId']));
        formData.append('tipo', String(payload['tipo']));
        formData.append('estado', String(payload['estado']));
        if (payload['observacion']) {
          formData.append('observacion', String(payload['observacion']));
        }
        this.appendPhoto(formData, fotoBlob, fotoBase64, 'file');

        await firstValueFrom(
          this.http.post<unknown>(this.ANOMALIES_API, formData, { withCredentials: true }),
        );
        await this.dbService.deletePendingAnomaly(id!);
        successAnomaliesCount++;
      } catch (error) {
        const httpError = error as HttpErrorResponse;
        if (this.isValidationError(httpError)) {
          await this.dbService.updatePendingAnomaly(pending.id!, {
            syncState: 'RECHAZADA',
            errorMessage: this.extractErrorMessage(httpError),
          });
          rejectedCount++;
        } else {
          console.error('Error de red al sincronizar anomalía, deteniendo cola:', error);
          break;
        }
      }
    }

    // Refrescar contadores finales
    await this.refreshPendingCounts();
    this.isSyncing.set(false);

    // Notificaciones de resultado
    if (successReadingsCount > 0 || successWorkOrdersCount > 0 || successAnomaliesCount > 0) {
      this.toastService.success(
        `Sincronización completa. Enviado exitosamente: ${successReadingsCount} lecturas, ${successWorkOrdersCount} órdenes y ${successAnomaliesCount} novedades.`,
        'Sincronizado',
      );
    }
    if (rejectedCount > 0) {
      this.toastService.warning(
        `${rejectedCount} registro(s) fueron rechazados por el servidor. Revísalos en "Sincronizar".`,
        'Registros Rechazados',
      );
    }
  }

  private readonly INITIAL_SYNC_KEY = 'jasrapo_operator_synced';

  /**
   * Returns true if no initial sync has been done this browser session.
   * Uses sessionStorage so it resets on tab close / new login.
   */
  needsInitialSync(): boolean {
    return !sessionStorage.getItem(this.INITIAL_SYNC_KEY);
  }

  markInitialSyncDone(): void {
    sessionStorage.setItem(this.INITIAL_SYNC_KEY, Date.now().toString());
  }

  clearInitialSyncFlag(): void {
    sessionStorage.removeItem(this.INITIAL_SYNC_KEY);
  }

  /**
   * Obtiene el catálogo de estados de lectura: cache offline primero, backend como fallback.
   */
  async getReadingEstados(): Promise<
    { codigo: string; nombre: string; orden: number; icono?: string }[]
  > {
    // Intentar backend primero (fuente de verdad)
    try {
      const estados = await firstValueFrom(
        this.http.get<{ codigo: string; nombre: string; orden: number; icono?: string }[]>(
          `${this.READINGS_API}/estados`,
          { withCredentials: true },
        ),
      );
      // Actualizar cache para uso offline
      await this.dbService.saveEstadosCache(estados).catch(() => undefined);
      return estados;
    } catch {
      // Fallback: cache offline
      const cached = await this.dbService.getEstadosCache();
      if (cached && cached.length > 0) {
        return cached;
      }
      throw new Error('No se pudo obtener el catálogo de estados');
    }
  }

  /**
   * Descarga todos los datos de trabajo del operador autenticado de forma atómica:
   * 1. Rutas asignadas
   * 2. Medidores correspondientes a sus rutas
   * 3. Lecturas del período
   * 4. Catálogo de estados
   *
   * Si cualquiera de las descargas falla, NO se muta la base local y se preserva el snapshot previo.
   */
  async downloadAssignedData(): Promise<{
    routesCount: number;
    metersCount: number;
    readingsCount: number;
  }> {
    this.assignedDataError.set(null);

    if (!this.networkService.isOnline()) {
      this.assignedDataError.set('offline');
      this.toastService.warning(
        'No tenés conexión a internet para descargar los datos del servidor.',
        'Sin Conexión',
      );
      throw new Error('Offline');
    }

    this.isDownloading.set(true);
    try {
      // Descargar todos los recursos en memoria en paralelo
      const [routes, meters, readings, estados] = await Promise.all([
        firstValueFrom(
          this.http.get<Record<string, unknown>[]>(`${this.OPERATOR_API}/routes`, {
            withCredentials: true,
          }),
        ),
        firstValueFrom(
          this.http.get<Record<string, unknown>[]>(`${this.OPERATOR_API}/sync`, {
            withCredentials: true,
          }),
        ),
        firstValueFrom(
          this.http.get<Record<string, unknown>[]>(`${this.OPERATOR_API}/readings`, {
            withCredentials: true,
          }),
        ),
        this.getReadingEstados().catch(() => []),
      ]);

      const currentUserId = this.authService.currentUser()?.id ?? null;
      const scope = currentUserId ? `operator:${currentUserId}` : 'assigned';

      // Guardar de forma atómica en una única transacción IndexedDB
      await this.dbService.saveCompleteAssignedSnapshot({
        routes,
        meters,
        registeredReadings: readings,
        estados,
        scope,
        operatorId: currentUserId ?? undefined,
      });

      this.markInitialSyncDone();
      this.saveLastDownloadDate();

      const result = {
        routesCount: routes.length,
        metersCount: meters.length,
        readingsCount: readings.length,
      };

      this.toastService.success(
        `Datos descargados con éxito: ${result.routesCount} rutas, ${result.metersCount} medidores y ${result.readingsCount} lecturas.`,
        'Descarga Completada',
      );

      return result;
    } catch (err: unknown) {
      console.error('Error al descargar datos del operador:', err);
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.assignedDataError.set('authorization');
        this.toastService.error(
          'No tenés autorización para descargar los datos asignados. Verificá tu sesión o permisos.',
          'Acceso no autorizado',
        );
      } else {
        this.assignedDataError.set('network');
        this.toastService.error(
          (err as HttpErrorResponse).error?.message || 'Error al descargar datos del servidor.',
          'Error de Descarga',
        );
      }
      throw err;
    } finally {
      this.isDownloading.set(false);
    }
  }

  /**
   * Sincroniza catálogo de medidores + lecturas registradas para uso offline.
   * Alias que delega en downloadAssignedData.
   */
  async syncCatalogAndReadings(): Promise<void> {
    await this.downloadAssignedData();
  }

  /**
   * Obtiene todas las lecturas del período de facturación actual/activo
   */
  async getCurrentPeriodReadings(): Promise<Record<string, unknown>[]> {
    try {
      return await firstValueFrom(
        this.http.get<Record<string, unknown>[]>(`${this.OPERATOR_API}/readings`, {
          withCredentials: true,
        }),
      );
    } catch (error) {
      console.error('Error al obtener lecturas del período actual:', error);
      throw error;
    }
  }
}
