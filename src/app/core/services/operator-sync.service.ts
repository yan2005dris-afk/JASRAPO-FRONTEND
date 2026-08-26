/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NetworkService } from './network.service';
import { IndexedDbService } from './indexed-db.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OperatorSyncService {
  private readonly http = inject(HttpClient);
  private readonly networkService = inject(NetworkService);
  private readonly dbService = inject(IndexedDbService);
  private readonly toastService = inject(ToastService);

  private readonly READINGS_API = `${environment.apiUrl}/readings`;
  private readonly OPERATOR_API = `${environment.apiUrl}/operator`;
  private readonly ANOMALIES_API = `${environment.apiUrl}/reading-anomalies`;

  // Signals para rastrear el estado de la cola
  readonly pendingReadingsCount = signal<number>(0);
  readonly pendingAnomaliesCount = signal<number>(0);
  readonly rejectedReadingsCount = signal<number>(0);
  readonly rejectedAnomaliesCount = signal<number>(0);
  readonly isSyncing = signal<boolean>(false);

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

  constructor() {
    this.refreshPendingCounts();
    this.networkService.connected$.subscribe(() => {
      if (this.autoSyncEnabled()) {
        this.syncPendingData();
      }
    });
  }

  private dataURItoBlob(dataURI: string): Blob {
    const splitDataURI = dataURI.split(',');
    const byteString =
      splitDataURI[0].indexOf('base64') >= 0 ? atob(splitDataURI[1]) : decodeURI(splitDataURI[1]);
    const mimeString = splitDataURI[0].split(':')[1].split(';')[0];
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], { type: mimeString });
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
   * Envia una lectura al backend o la encola si está offline.
   * Si reading._lecturaId está presente → PATCH (actualizar existente)
   * Si no → POST (crear nueva)
   */
  async submitReading(reading: any): Promise<any> {
    const { _lecturaId, fotoBase64, ...payload } = reading;

    if (this.networkService.isOnline()) {
      try {
        const formData = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
        if (fotoBase64) {
          const blob = this.dataURItoBlob(fotoBase64);
          const fieldName = _lecturaId ? 'foto' : 'file';
          formData.append(fieldName, blob, 'foto.jpg');
        }

        const request$ = _lecturaId
          ? this.http.patch<any>(`${this.OPERATOR_API}/readings/${_lecturaId}`, formData, {
              withCredentials: true,
            })
          : this.http.post<any>(this.READINGS_API, formData, { withCredentials: true });

        const response = await firstValueFrom(request$);
        await this.dbService.saveSyncedReading({ ...payload, _lecturaId });
        this.toastService.success('Lectura registrada en el servidor correctamente.', 'Éxito');
        return response;
      } catch (error: any) {
        this.toastService.error(
          error.error?.message || 'Error al enviar lectura al servidor.',
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
  async submitAnomaly(anomaly: any): Promise<any> {
    if (this.networkService.isOnline()) {
      try {
        const formData = new FormData();
        formData.append('lecturaId', String(anomaly.lecturaId));
        formData.append('tipo', String(anomaly.tipo));
        formData.append('estado', String(anomaly.estado));
        if (anomaly.observacion) {
          formData.append('observacion', String(anomaly.observacion));
        }
        if (anomaly.fotoBase64) {
          const blob = this.dataURItoBlob(anomaly.fotoBase64);
          formData.append('file', blob, 'evidencia.jpg');
        }

        const response = await firstValueFrom(
          this.http.post<any>(this.ANOMALIES_API, formData, { withCredentials: true }),
        );
        this.toastService.success('Novedad/Anomalía registrada en el servidor.', 'Éxito');
        return response;
      } catch (error: any) {
        this.toastService.error(
          error.error?.message || 'Error al enviar novedad al servidor.',
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
    let successAnomaliesCount = 0;
    let rejectedCount = 0;

    // 1. Sincronizar primero las lecturas encoladas
    for (const pending of readings) {
      try {
        const {
          id,
          syncState: _syncState, // eslint-disable-line @typescript-eslint/no-unused-vars
          errorMessage: _errorMessage, // eslint-disable-line @typescript-eslint/no-unused-vars
          _lecturaId,
          fotoBase64,
          ...payload
        } = pending;

        const formData = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
        if (fotoBase64) {
          const blob = this.dataURItoBlob(fotoBase64);
          const fieldName = _lecturaId ? 'foto' : 'file';
          formData.append(fieldName, blob, 'foto.jpg');
        }

        const request$ = _lecturaId
          ? this.http.patch<any>(`${this.OPERATOR_API}/readings/${_lecturaId}`, formData, {
              withCredentials: true,
            })
          : this.http.post<any>(this.READINGS_API, formData, { withCredentials: true });
        await firstValueFrom(request$);
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
        if (fotoBase64) {
          const blob = this.dataURItoBlob(fotoBase64);
          formData.append('file', blob, 'evidencia.jpg');
        }

        await firstValueFrom(
          this.http.post<any>(this.ANOMALIES_API, formData, { withCredentials: true }),
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
    if (successReadingsCount > 0 || successAnomaliesCount > 0) {
      this.toastService.success(
        `Sincronización completa. Enviado exitosamente: ${successReadingsCount} lecturas y ${successAnomaliesCount} novedades.`,
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
   * Sincroniza catálogo de medidores + lecturas registradas para uso offline.
   *
   */
  async syncCatalogAndReadings(): Promise<void> {
    try {
      // 1. Descargar catálogo completo de medidores
      const meters = await firstValueFrom(
        this.http.get<any[]>(`${this.OPERATOR_API}/sync`, { withCredentials: true }),
      );
      await this.dbService.saveMetersCache(meters);

      // 2. Descargar lecturas ya registradas en el periodo actual
      const readings = await firstValueFrom(
        this.http.get<any[]>(`${this.OPERATOR_API}/readings`, { withCredentials: true }),
      );
      await this.dbService.saveRegisteredReadingsCache(readings);

      // 3. Cachear catálogo de estados de lectura para offline
      try {
        const estados = await this.getReadingEstados();
        await this.dbService.saveEstadosCache(estados);
      } catch {
        // Si falla, no es crítico — loadEstadosCatalog tiene fallback hardcoded
      }

      this.markInitialSyncDone();
      this.toastService.success(
        'Catálogo y lecturas del período actual actualizados para uso offline.',
        'Sincronizado',
      );
    } catch (err) {
      console.error('Error al sincronizar datos para offline:', err);
    }
  }

  /**
   * Obtiene todas las lecturas del período de facturación actual/activo
   */
  async getCurrentPeriodReadings(): Promise<any[]> {
    try {
      return await firstValueFrom(
        this.http.get<any[]>(`${this.OPERATOR_API}/readings`, { withCredentials: true }),
      );
    } catch (error) {
      console.error('Error al obtener lecturas del período actual:', error);
      throw error;
    }
  }
}
