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
import { IndexedDbService, PendingRecord } from '../../../../core/services/indexed-db.service';
import { OperatorSyncService } from '../../../../core/services/operator-sync.service';
import { NetworkService } from '../../../../core/services/network.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
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

const PAGE_SIZE = 50;

@Component({
  selector: 'app-sincronizar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
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

  // Pagination
  readonly pendingPage = signal(0);
  readonly rejectedPage = signal(0);
  readonly syncedPage = signal(0);

  readonly totalPendientes = computed(
    () => this.pendingReadings().length + this.pendingAnomalies().length,
  );
  readonly totalRechazados = computed(
    () => this.rejectedReadings().length + this.rejectedAnomalies().length,
  );

  // All records combined per tab (for unified pagination)
  readonly allPendingItems = computed(() => [
    ...this.pendingReadings(),
    ...this.pendingAnomalies(),
  ]);
  readonly allRejectedItems = computed(() => [
    ...this.rejectedReadings(),
    ...this.rejectedAnomalies(),
  ]);

  // Paginated slices
  readonly pendingPageItems = computed(() =>
    this.allPendingItems().slice(
      this.pendingPage() * PAGE_SIZE,
      (this.pendingPage() + 1) * PAGE_SIZE,
    ),
  );
  readonly pendingTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.allPendingItems().length / PAGE_SIZE)),
  );

  readonly rejectedPageItems = computed(() =>
    this.allRejectedItems().slice(
      this.rejectedPage() * PAGE_SIZE,
      (this.rejectedPage() + 1) * PAGE_SIZE,
    ),
  );
  readonly rejectedTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.allRejectedItems().length / PAGE_SIZE)),
  );

  readonly syncedPageItems = computed(() =>
    this.syncedReadings().slice(this.syncedPage() * PAGE_SIZE, (this.syncedPage() + 1) * PAGE_SIZE),
  );
  readonly syncedTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.syncedReadings().length / PAGE_SIZE)),
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
    // Reset pagination when switching tabs
    this.pendingPage.set(0);
    this.rejectedPage.set(0);
    this.syncedPage.set(0);
  }

  // Pagination helpers
  goToPendingPage(page: number): void {
    this.pendingPage.set(Math.max(0, Math.min(page, this.pendingTotalPages() - 1)));
  }

  goToRejectedPage(page: number): void {
    this.rejectedPage.set(Math.max(0, Math.min(page, this.rejectedTotalPages() - 1)));
  }

  goToSyncedPage(page: number): void {
    this.syncedPage.set(Math.max(0, Math.min(page, this.syncedTotalPages() - 1)));
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

  async retryReading(record: PendingRecord): Promise<void> {
    if (!record.id) return;
    await this.dbService.updatePendingReading(record.id, {
      syncState: 'PENDIENTE_SYNC',
      errorMessage: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    this.toastService.info('Lectura encolada para reintentar sincronización.', 'Reintento');
    await this.loadQueue();
    await this.syncService.refreshPendingCounts();
    if (this.networkService.isOnline()) {
      await this.forceSync();
    }
  }

  async retryAnomaly(record: PendingRecord): Promise<void> {
    if (!record.id) return;
    await this.dbService.updatePendingAnomaly(record.id, {
      syncState: 'PENDIENTE_SYNC',
      errorMessage: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    this.toastService.info('Novedad encolada para reintentar sincronización.', 'Reintento');
    await this.loadQueue();
    await this.syncService.refreshPendingCounts();
    if (this.networkService.isOnline()) {
      await this.forceSync();
    }
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

  async clearLocalDatabase(): Promise<void> {
    const hasPending = this.totalPendientes() > 0;
    const warningMsg = hasPending
      ? '¡Atención! Tienes registros pendientes de envío. Se conservarán tus pendientes, pero se reiniciará el catálogo descargado (rutas, medidores). Luego deberás volver a descargar los datos desde el servidor.'
      : 'Esta acción limpiará el caché local de rutas, medidores y snapshots descargados para permitir una sincronización limpia desde el servidor. ¿Deseas continuar?';

    const confirmed = await firstValueFrom(
      this.confirmService.confirm({
        title: 'Reiniciar Base de Datos Local',
        message: warningMsg,
        confirmText: 'Reiniciar',
        cancelText: 'Cancelar',
        isDanger: true,
      }),
    );

    if (!confirmed) return;

    try {
      const operatorId = this.authService.currentUser()?.id;
      const scope = operatorId ? `operator:${operatorId}` : undefined;
      await this.dbService.clearAssignedCache(scope);
      await this.loadQueue();
      this.toastService.success(
        'Almacenamiento local reiniciado con éxito. Podés descargar datos frescos.',
        'Base de Datos Reiniciada',
      );
    } catch (e) {
      console.error('Error al limpiar base de datos local:', e);
      this.toastService.error('No se pudo reiniciar la base de datos local.', 'Error');
    }
  }
}
