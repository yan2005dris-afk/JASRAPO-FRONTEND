import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IndexedDbService, PendingRecord } from '../../../core/services/indexed-db.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { NetworkService } from '../../../core/services/network.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { firstValueFrom } from 'rxjs';
import {
  SyncReadingEditorComponent,
  type ReadingEditResult,
} from '../components/sync-editors/sync-reading-editor.component';
import {
  SyncAnomalyEditorComponent,
  type AnomalyEditResult,
} from '../components/sync-editors/sync-anomaly-editor.component';

type QueueTab = 'pendientes' | 'rechazados' | 'sincronizados';

@Component({
  selector: 'app-sincronizar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    RouterLink,
    SyncReadingEditorComponent,
    SyncAnomalyEditorComponent,
  ],
  templateUrl: './sincronizar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './sincronizar.component.scss',
})
export class SincronizarComponent implements OnInit {
  private readonly dbService = inject(IndexedDbService);
  readonly syncService = inject(OperatorSyncService);
  readonly networkService = inject(NetworkService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmDialogService);

  readonly activeTab = signal<QueueTab>('pendientes');

  readonly pendingReadings = signal<PendingRecord[]>([]);
  readonly pendingAnomalies = signal<PendingRecord[]>([]);
  readonly rejectedReadings = signal<PendingRecord[]>([]);
  readonly rejectedAnomalies = signal<PendingRecord[]>([]);
  readonly syncedReadings = signal<PendingRecord[]>([]);

  // Offline storage metrics
  readonly cachedMetersCount = signal<number>(0);
  readonly cachedRoutesCount = signal<number>(0);
  readonly cachedReadingsCount = signal<number>(0);
  readonly authorizationWarning = signal(false);

  // Editing state
  readonly editingRecord = signal<PendingRecord | null>(null);
  readonly editingType = signal<'lectura' | 'anomalia' | null>(null);

  readonly totalPendientes = computed(
    () => this.pendingReadings().length + this.pendingAnomalies().length,
  );
  readonly totalRechazados = computed(
    () => this.rejectedReadings().length + this.rejectedAnomalies().length,
  );

  ngOnInit(): void {
    this.loadQueue();
  }

  async downloadData(): Promise<void> {
    try {
      await this.syncService.downloadAssignedData();
      this.authorizationWarning.set(false);
      await this.loadQueue();
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
      this.authorizationWarning.set(status === 401 || status === 403);
      // El servicio ya informa si es offline, red o autorización.
    }
  }

  async loadQueue(): Promise<void> {
    try {
      const operatorId = this.authService.currentUser()?.id;
      const scope = operatorId ? `operator:${operatorId}` : 'assigned';

      const [pendR, rejR, pendA, rejA, synced, meters, routesCache, registeredReadings] =
        await Promise.all([
          this.dbService.getPendingReadingsByState('PENDIENTE_SYNC'),
          this.dbService.getPendingReadingsByState('RECHAZADA'),
          this.dbService.getPendingAnomaliesByState('PENDIENTE_SYNC'),
          this.dbService.getPendingAnomaliesByState('RECHAZADA'),
          this.dbService.getSyncedReadings(),
          this.dbService.getMetersCache(scope),
          this.dbService.getRoutesCache(scope),
          this.dbService.getRegisteredReadingsCache(scope),
        ]);

      this.cachedMetersCount.set(meters.length);
      this.cachedRoutesCount.set(routesCache?.items?.length ?? 0);
      this.cachedReadingsCount.set(registeredReadings.length);

      const metersMap = new Map<string, { clienteNombre?: string | null; serie?: string }>(
        meters.map((m: { medidorId?: number; clienteNombre?: string | null; serie?: string }) => [
          m.medidorId?.toString() ?? '',
          m,
        ]),
      );

      const enrich = (record: PendingRecord): PendingRecord => {
        const mId = record['medidorId'];
        const meter = mId != null ? metersMap.get(mId.toString()) : undefined;
        return meter
          ? { ...record, clienteNombre: meter.clienteNombre, serie: meter.serie }
          : record;
      };

      this.pendingReadings.set(pendR.map(enrich));
      this.rejectedReadings.set(rejR.map(enrich));
      this.pendingAnomalies.set(pendA.map(enrich));
      this.rejectedAnomalies.set(rejA.map(enrich));
      this.syncedReadings.set(synced.map(enrich));
    } catch (e) {
      console.error('Error al cargar cola de sincronización:', e);
    }
  }

  async clearHistory(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.confirmService.confirm({
        title: 'Limpiar Historial',
        message:
          '¿Estás seguro de que querés limpiar el historial de sincronización? Esta acción no se puede deshacer.',
        confirmText: 'Limpiar',
        cancelText: 'Cancelar',
        isDanger: true,
      }),
    );

    if (!confirmed) return;

    await this.dbService.clearSyncedReadings();
    this.syncedReadings.set([]);
    this.toastService.info('Historial de sincronización limpiado.', 'Historial');
  }

  switchTab(tab: QueueTab): void {
    this.activeTab.set(tab);
    this.cancelEdit();
  }

  // --- Edit flow ---

  startEditReading(record: PendingRecord): void {
    this.editingRecord.set(record);
    this.editingType.set('lectura');
  }

  startEditAnomaly(record: PendingRecord): void {
    this.editingRecord.set(record);
    this.editingType.set('anomalia');
  }

  isWorkOrder(record: PendingRecord): boolean {
    return record['recordType'] === 'WORK_ORDER';
  }

  cancelEdit(): void {
    this.editingRecord.set(null);
    this.editingType.set(null);
  }

  async onReadingEditorSaved(result: ReadingEditResult): Promise<void> {
    await this.dbService.updatePendingReading(result.recordId, {
      lecturaActual: result.lecturaActual,
      lecturaAnterior: result.lecturaAnterior,
      lecturaInicial: result.lecturaInicial,
      consumoCalculado: result.consumoCalculado,
      syncState: 'PENDIENTE_SYNC',
      errorMessage: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    this.toastService.success(
      'Lectura corregida. Se reenviará en la próxima sincronización.',
      'Corregido',
    );
    this.cancelEdit();
    await this.loadQueue();
    await this.syncService.refreshPendingCounts();
  }

  async onAnomalyEditorSaved(result: AnomalyEditResult): Promise<void> {
    await this.dbService.updatePendingAnomaly(result.recordId, {
      observacion: result.observacion,
      tipo: result.tipo,
      fotoBase64: result.fotoBase64 ?? null,
      fotoBlob: result.fotoBlob ?? null,
      syncState: 'PENDIENTE_SYNC',
      errorMessage: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    this.toastService.success(
      'Novedad corregida. Se reenviará en la próxima sincronización.',
      'Corregido',
    );
    this.cancelEdit();
    await this.loadQueue();
    await this.syncService.refreshPendingCounts();
  }

  async discardReading(record: PendingRecord): Promise<void> {
    if (!record.id) return;

    const confirmed = await firstValueFrom(
      this.confirmService.confirm({
        title: 'Descartar Lectura',
        message: '¿Estás seguro de que querés descartar esta lectura de la cola de sincronización?',
        confirmText: 'Descartar',
        cancelText: 'Cancelar',
        isDanger: true,
      }),
    );

    if (!confirmed) return;

    await this.dbService.deletePendingReading(record.id);
    this.toastService.info('Lectura descartada de la cola.', 'Descartado');
    await this.loadQueue();
    await this.syncService.refreshPendingCounts();
  }

  async discardAnomaly(record: PendingRecord): Promise<void> {
    if (!record.id) return;

    const confirmed = await firstValueFrom(
      this.confirmService.confirm({
        title: 'Descartar Novedad',
        message: '¿Estás seguro de que querés descartar esta novedad de la cola de sincronización?',
        confirmText: 'Descartar',
        cancelText: 'Cancelar',
        isDanger: true,
      }),
    );

    if (!confirmed) return;

    await this.dbService.deletePendingAnomaly(record.id);
    this.toastService.info('Novedad descartada de la cola.', 'Descartado');
    await this.loadQueue();
    await this.syncService.refreshPendingCounts();
  }

  async forceSync(): Promise<void> {
    await this.syncService.syncPendingData();
    await this.loadQueue();
  }
}
