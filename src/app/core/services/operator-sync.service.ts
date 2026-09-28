import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { NetworkService } from './network.service';
import { IndexedDbService } from './indexed-db.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import {
  MANIFEST_PROTOCOL_VERSION,
  type OperatorManifestPage,
} from '../../features/operator/models/operator.models';

type PayloadValue = string | number | boolean | Blob | null | undefined;
type WorkOrderDtoField = 'estado' | 'resultadoObservacion' | 'completadoEn';
type WorkOrderDtoPayload = Partial<Record<WorkOrderDtoField, PayloadValue>>;
export interface ReadingSubmission {
  _lecturaId?: string | number;
  fotoBlob?: Blob | null;
  [key: string]: PayloadValue;
}
export interface WorkOrderSubmission {
  ordenTrabajoId?: string | number;
  fotoBlob?: Blob | null;
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
  private readonly NOVELTIES_API = `${environment.apiUrl}/work-order-novelties`;

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

  private normalizeManifestCollection(collection: unknown): Record<string, unknown>[] | undefined {
    if (collection === undefined) return undefined;
    if (Array.isArray(collection)) return collection as Record<string, unknown>[];
    if (typeof collection !== 'object' || collection === null) {
      throw new Error('Invalid manifest collection: items must be an array');
    }

    const value = collection as Record<string, unknown>;
    if (Array.isArray(value['items'])) return value['items'] as Record<string, unknown>[];
    // Some backend adapters wrap paginated collections in a `data` envelope.
    if (value['data'] !== undefined) return this.normalizeManifestCollection(value['data']);
    throw new Error('Invalid manifest collection: items must be an array');
  }

  private normalizeManifestPage(page: OperatorManifestPage): OperatorManifestPage {
    if (!page || (page.mode !== 'snapshot' && page.mode !== 'incremental')) {
      throw new Error('Invalid manifest mode');
    }

    return {
      ...page,
      routes: this.normalizeManifestCollection(page.routes),
      workOrders: this.normalizeManifestCollection(page.workOrders),
      meters: this.normalizeManifestCollection(page.meters),
      readings: this.normalizeManifestCollection(page.readings),
      pendingAnomalies: this.normalizeManifestCollection(page.pendingAnomalies),
    };
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
    photoBlob?: Blob | null,
    field = 'foto',
    filename = 'evidencia.jpg',
  ): void {
    if (photoBlob instanceof Blob) formData.append(field, photoBlob, filename);
  }

  /** Normaliza el contrato estricto aceptado por PATCH /operator/work-orders/:id. */
  private normalizeWorkOrderPayload(workOrder: WorkOrderSubmission): WorkOrderDtoPayload {
    const payload: WorkOrderDtoPayload = {};
    const acceptedFields: WorkOrderDtoField[] = ['estado', 'resultadoObservacion', 'completadoEn'];

    for (const field of acceptedFields) {
      const value = workOrder[field];
      if (value !== null && value !== undefined) payload[field] = value;
    }

    if (
      (workOrder['resultadoObservacion'] === null ||
        workOrder['resultadoObservacion'] === undefined) &&
      workOrder['observaciones'] !== null &&
      workOrder['observaciones'] !== undefined
    ) {
      payload.resultadoObservacion = workOrder['observaciones'];
    }

    return payload;
  }

  private appendWorkOrderPayload(formData: FormData, payload: WorkOrderDtoPayload): void {
    for (const [key, value] of Object.entries(payload)) {
      if (value !== null && value !== undefined) formData.append(key, String(value));
    }
  }

  /** Normaliza el contrato estricto aceptado por PATCH /operator/readings/:id (UpdateOperatorReadingDto). */
  private normalizeReadingPayload(reading: Record<string, unknown>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    const acceptedFields = [
      'fecha',
      'lecturaAnterior',
      'lecturaActual',
      'descripcionAnomalia',
      'lecturaInicial',
    ];

    for (const field of acceptedFields) {
      const value = reading[field];
      if (value !== null && value !== undefined && value !== '') {
        if (field === 'lecturaAnterior' || field === 'lecturaActual') {
          payload[field] = Number(value);
        } else if (field === 'lecturaInicial') {
          payload[field] = Boolean(value);
        } else {
          payload[field] = value;
        }
      }
    }

    return payload;
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
  async submitReading(reading: ReadingSubmission & { fotoBlob?: Blob | null }): Promise<unknown> {
    const { _lecturaId, fotoBlob, ...payload } = reading;
    let targetLecturaId = _lecturaId;

    if (!targetLecturaId || String(targetLecturaId).trim() === '') {
      try {
        const cached = await this.dbService.getRegisteredReadingsCache();
        const targetMeterId = payload['medidorId'] ? String(payload['medidorId']) : null;
        const targetSerie = (payload as Record<string, unknown>)['medidorSerie']
          ? String((payload as Record<string, unknown>)['medidorSerie'])
          : null;

        let match = cached.find((r: Record<string, unknown>) => {
          const medidor = r['medidor'] as Record<string, unknown> | undefined;
          const mId = medidor?.['medidorId'] ?? r['medidorId'];
          const s = medidor?.['serie'] ?? r['medidorSerie'];
          return (
            (targetMeterId && String(mId) === targetMeterId) || (targetSerie && s === targetSerie)
          );
        });

        if (!match && this.networkService.isOnline()) {
          const fresh = await this.getCurrentPeriodReadings();
          if (fresh?.length) {
            await this.dbService.saveRegisteredReadingsCache(fresh);
            match = (fresh as unknown as Record<string, unknown>[]).find(
              (r: Record<string, unknown>) => {
                const medidor = r['medidor'] as Record<string, unknown> | undefined;
                const mId = medidor?.['medidorId'] ?? r['medidorId'];
                const s = medidor?.['serie'] ?? r['medidorSerie'];
                return (
                  (targetMeterId && String(mId) === targetMeterId) ||
                  (targetSerie && s === targetSerie)
                );
              },
            );
          }
        }

        if (match?.lecturaId) {
          targetLecturaId = String(match.lecturaId);
        }
      } catch {
        // Silencioso
      }
    }

    const hasId =
      targetLecturaId !== null &&
      targetLecturaId !== undefined &&
      String(targetLecturaId).trim() !== '';
    if (this.networkService.isOnline() && !hasId) {
      throw new Error(
        'No se puede enviar una lectura nueva en línea: el backend no expone un endpoint de creación.',
      );
    }

    if (this.networkService.isOnline()) {
      try {
        const formData = new FormData();
        const normalized = this.normalizeReadingPayload(payload);
        for (const [key, value] of Object.entries(normalized)) {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
        this.appendPhoto(formData, fotoBlob, 'foto', 'foto.jpg');

        const request$ = this.http.patch<unknown>(
          `${this.OPERATOR_API}/readings/${targetLecturaId}`,
          formData,
          {
            withCredentials: true,
          },
        );

        const response = await firstValueFrom(request$);
        await this.dbService.saveSyncedReading({ ...payload, _lecturaId: targetLecturaId });
        this.toastService.success('Lectura registrada en el servidor correctamente.', 'Éxito');
        return response;
      } catch (error: unknown) {
        const httpError = error as HttpErrorResponse;
        if (!httpError.status || httpError.status === 0 || httpError.status >= 500) {
          console.warn('Fallo de red al enviar lectura, guardando localmente:', error);
          await this.dbService.savePendingReading(reading);
          await this.refreshPendingCounts();
          this.toastService.warning(
            'Error de conexión con el servidor. Lectura guardada localmente; se sincronizará automáticamente.',
            'Guardado Local',
          );
          return { offline: true };
        }
        this.toastService.error(
          httpError.error?.message || 'Error al enviar lectura al servidor.',
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
   * Envia una novedad al backend (/work-order-novelties) o la encola si está offline.
   */
  async submitAnomaly(anomaly: Record<string, unknown>): Promise<unknown> {
    const ordenTrabajoId =
      anomaly['ordenTrabajoId'] !== null && anomaly['ordenTrabajoId'] !== undefined
        ? String(anomaly['ordenTrabajoId']).trim()
        : '';

    if (this.networkService.isOnline()) {
      if (!ordenTrabajoId) {
        throw new Error(
          'No se puede registrar la novedad: se requiere una orden de trabajo asociada.',
        );
      }
      try {
        const formData = new FormData();
        formData.append('ordenTrabajoId', ordenTrabajoId);
        if (anomaly['lecturaId']) {
          formData.append('lecturaId', String(anomaly['lecturaId']));
        }
        formData.append('tipo', String(anomaly['tipo']));
        if (anomaly['observacion']) {
          formData.append('observacion', String(anomaly['observacion']));
        }
        this.appendPhoto(formData, (anomaly['fotoBlob'] as Blob) || null, 'file');

        const response = await firstValueFrom(
          this.http.post<unknown>(this.NOVELTIES_API, formData, { withCredentials: true }),
        );
        this.toastService.success('Novedad registrada en el servidor.', 'Éxito');
        return response;
      } catch (error: unknown) {
        const httpError = error as HttpErrorResponse;
        if (!httpError.status || httpError.status === 0 || httpError.status >= 500) {
          console.warn('Fallo de red al enviar novedad, guardando localmente:', error);
          await this.dbService.savePendingAnomaly(anomaly);
          await this.refreshPendingCounts();
          this.toastService.warning(
            'Error de conexión con el servidor. Novedad guardada localmente; se sincronizará automáticamente.',
            'Guardado Local',
          );
          return { offline: true };
        }
        this.toastService.error(
          httpError.error?.message || 'Error al enviar novedad al servidor.',
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

  async submitNovelty(novelty: Record<string, unknown>): Promise<unknown> {
    return this.submitAnomaly(novelty);
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
    const { ordenTrabajoId, fotoBlob } = workOrder;
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
        this.appendWorkOrderPayload(formData, this.normalizeWorkOrderPayload(workOrder));
        this.appendPhoto(formData, fotoBlob);

        const url = `${this.OPERATOR_API}/work-orders/${ordenTrabajoId}`;
        const request$ = this.http.patch<unknown>(url, formData, { withCredentials: true });

        const response = await firstValueFrom(request$);
        this.toastService.success('Orden de trabajo registrada correctamente.', 'Éxito');
        return response;
      } catch (error: unknown) {
        const httpError = error as HttpErrorResponse;
        if (!httpError.status || httpError.status === 0 || httpError.status >= 500) {
          console.warn('Fallo de red al enviar orden de trabajo, guardando localmente:', error);
          await this.dbService.savePendingReading({ ...workOrder, recordType: 'WORK_ORDER' });
          await this.refreshPendingCounts();
          this.toastService.warning(
            'Error de conexión con el servidor. Orden guardada localmente; se sincronizará automáticamente.',
            'Guardado Local',
          );
          return { offline: true };
        }
        this.toastService.error(
          httpError.error?.message || 'Error al enviar orden al servidor.',
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
            ...workOrderPayload
          } = pending;
          const formData = new FormData();
          this.appendWorkOrderPayload(formData, this.normalizeWorkOrderPayload(workOrderPayload));
          this.appendPhoto(formData, fotoBlob);
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
          ...payload
        } = pending;

        let targetLecturaId = _lecturaId;
        if (
          targetLecturaId === null ||
          targetLecturaId === undefined ||
          String(targetLecturaId).trim() === ''
        ) {
          try {
            const cached = await this.dbService.getRegisteredReadingsCache();
            const targetMeterId = pending['medidorId'] ? String(pending['medidorId']) : null;
            const targetSerie = (pending as Record<string, unknown>)['medidorSerie']
              ? String((pending as Record<string, unknown>)['medidorSerie'])
              : null;

            let match = cached.find((r: Record<string, unknown>) => {
              const medidor = r['medidor'] as Record<string, unknown> | undefined;
              const mId = medidor?.['medidorId'] ?? r['medidorId'];
              const s = medidor?.['serie'] ?? r['medidorSerie'];
              return (
                (targetMeterId && String(mId) === targetMeterId) ||
                (targetSerie && s === targetSerie)
              );
            });

            if (!match && this.networkService.isOnline()) {
              const fresh = await this.getCurrentPeriodReadings();
              if (fresh?.length) {
                await this.dbService.saveRegisteredReadingsCache(fresh);
                match = (fresh as unknown as Record<string, unknown>[]).find(
                  (r: Record<string, unknown>) => {
                    const medidor = r['medidor'] as Record<string, unknown> | undefined;
                    const mId = medidor?.['medidorId'] ?? r['medidorId'];
                    const s = medidor?.['serie'] ?? r['medidorSerie'];
                    return (
                      (targetMeterId && String(mId) === targetMeterId) ||
                      (targetSerie && s === targetSerie)
                    );
                  },
                );
              }
            }

            if (match && typeof match === 'object' && 'lecturaId' in match && match['lecturaId']) {
              targetLecturaId = String(match['lecturaId']);
              await this.dbService.updatePendingReading(pending.id!, {
                _lecturaId: targetLecturaId,
              });
            }
          } catch {
            // Silencioso
          }
        }

        const formData = new FormData();
        const normalized = this.normalizeReadingPayload(payload);
        for (const [key, value] of Object.entries(normalized)) {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
        this.appendPhoto(formData, fotoBlob, 'foto', 'foto.jpg');

        if (
          targetLecturaId === null ||
          targetLecturaId === undefined ||
          String(targetLecturaId).trim() === ''
        ) {
          await this.dbService.updatePendingReading(pending.id!, {
            syncState: 'RECHAZADA',
            errorMessage:
              'Lectura nueva conservada, pero no sincronizada: el backend no expone un endpoint de creación.',
          });
          rejectedCount++;
          continue;
        }
        await firstValueFrom(
          this.http.patch<unknown>(`${this.OPERATOR_API}/readings/${targetLecturaId}`, formData, {
            withCredentials: true,
          }),
        );
        await this.dbService.saveSyncedReading({ ...payload, _lecturaId: targetLecturaId });
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
          ...payload
        } = pending;

        const ordenTrabajoId =
          payload['ordenTrabajoId'] !== null && payload['ordenTrabajoId'] !== undefined
            ? String(payload['ordenTrabajoId']).trim()
            : '';

        if (!ordenTrabajoId) {
          await this.dbService.updatePendingAnomaly(pending.id!, {
            syncState: 'RECHAZADA',
            errorMessage:
              'Novedad rechazada: no tiene orden de trabajo asociada para registrar en el servidor.',
          });
          rejectedCount++;
          continue;
        }

        const formData = new FormData();
        formData.append('ordenTrabajoId', ordenTrabajoId);
        if (payload['lecturaId']) {
          formData.append('lecturaId', String(payload['lecturaId']));
        }
        formData.append('tipo', String(payload['tipo']));
        if (payload['observacion']) {
          formData.append('observacion', String(payload['observacion']));
        }
        this.appendPhoto(formData, fotoBlob, 'file');

        await firstValueFrom(
          this.http.post<unknown>(this.NOVELTIES_API, formData, { withCredentials: true }),
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
    workOrdersCount: number;
    pendingAnomaliesCount: number;
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
      const currentUserId = this.authService.currentUser()?.id ?? null;
      const scope = currentUserId ? `operator:${currentUserId}` : 'assigned';
      const existing = await this.dbService.getAssignedSnapshot(scope);
      // A previous failed run may have left an unpublished pending snapshot.
      // Always retry from the last complete active cursor.
      await this.dbService.discardPendingManifest(scope);
      const needsFreshSnapshot =
        !existing || existing.manifestProtocolVersion !== MANIFEST_PROTOCOL_VERSION;
      let cursor: string | null = needsFreshSnapshot ? null : (existing.cursor ?? null);
      let page: OperatorManifestPage | null = null;
      let restarted = false;
      do {
        let params = new HttpParams().set('limit', '100');
        if (cursor !== null) params = params.set('cursor', cursor);
        try {
          const response = await firstValueFrom(
            this.http.get<OperatorManifestPage>(`${this.OPERATOR_API}/sync/manifest`, {
              params,
              withCredentials: true,
            }),
          );
          page = this.normalizeManifestPage(response);
          await this.dbService.applyManifestPage(scope, page, currentUserId ?? undefined);
          cursor = page.nextCursor;
          if (!page.complete && cursor === null)
            throw new Error('Manifest page incomplete without nextCursor');
        } catch (error: unknown) {
          if (error instanceof HttpErrorResponse && error.status === 409 && !restarted) {
            restarted = true;
            cursor = null;
            continue;
          }
          throw error;
        }
      } while (!page?.complete);
      const snapshot = await this.dbService.getAssignedSnapshot(scope);
      if (!snapshot) throw new Error('Manifest snapshot unavailable after download');
      const estados = await this.getReadingEstados().catch(() => []);
      if (estados.length > 0) await this.dbService.saveEstadosCache(estados);

      this.markInitialSyncDone();
      this.saveLastDownloadDate();

      const result = {
        routesCount: snapshot.routes.length,
        metersCount: snapshot.meters.length,
        readingsCount: snapshot.registeredReadings.length,
        workOrdersCount: snapshot.workOrders.length,
        pendingAnomaliesCount: snapshot.pendingAnomalies.length,
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
