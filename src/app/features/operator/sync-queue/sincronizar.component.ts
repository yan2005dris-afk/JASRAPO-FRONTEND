import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndexedDbService, PendingRecord } from '../../../core/services/indexed-db.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { NetworkService } from '../../../core/services/network.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { firstValueFrom } from 'rxjs';

type QueueTab = 'pendientes' | 'rechazados' | 'sincronizados';

@Component({
  selector: 'app-sincronizar',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './sincronizar.component.html',
  styleUrl: './sincronizar.component.scss',
})
export class SincronizarComponent implements OnInit {
  private readonly dbService = inject(IndexedDbService);
  readonly syncService = inject(OperatorSyncService);
  readonly networkService = inject(NetworkService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmDialogService);

  readonly activeTab = signal<QueueTab>('pendientes');

  readonly pendingReadings = signal<PendingRecord[]>([]);
  readonly pendingAnomalies = signal<PendingRecord[]>([]);
  readonly rejectedReadings = signal<PendingRecord[]>([]);
  readonly rejectedAnomalies = signal<PendingRecord[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly syncedReadings = signal<any[]>([]);

  // Editing state
  readonly editingRecord = signal<PendingRecord | null>(null);
  readonly editingType = signal<'lectura' | 'anomalia' | null>(null);

  // Edit form model values
  editLecturaActual = 0;
  editLecturaAnterior = 0;
  editLecturaInicial = false;
  editObservacion = '';
  editTipo = '';

  readonly totalPendientes = computed(
    () => this.pendingReadings().length + this.pendingAnomalies().length,
  );
  readonly totalRechazados = computed(
    () => this.rejectedReadings().length + this.rejectedAnomalies().length,
  );

  ngOnInit(): void {
    this.loadQueue();
  }

  async loadQueue(): Promise<void> {
    try {
      const [pendR, rejR, pendA, rejA, synced, meters] = await Promise.all([
        this.dbService.getPendingReadingsByState('PENDIENTE_SYNC'),
        this.dbService.getPendingReadingsByState('RECHAZADA'),
        this.dbService.getPendingAnomaliesByState('PENDIENTE_SYNC'),
        this.dbService.getPendingAnomaliesByState('RECHAZADA'),
        this.dbService.getSyncedReadings(),
        this.dbService.getMetersCache(),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metersMap = new Map<string, any>(meters.map((m: any) => [m.medidorId?.toString(), m]));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrich = (record: any) => {
        const meter = metersMap.get(record.medidorId?.toString());
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
        message: '¿Estás seguro de que querés limpiar el historial de sincronización? Esta acción no se puede deshacer.',
        confirmText: 'Limpiar',
        cancelText: 'Cancelar',
        isDanger: true,
      })
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
    this.editLecturaActual = record['lecturaActual'] ?? 0;
    this.editLecturaAnterior = record['lecturaAnterior'] ?? 0;
    this.editLecturaInicial = record['lecturaInicial'] ?? false;
  }

  startEditAnomaly(record: PendingRecord): void {
    this.editingRecord.set(record);
    this.editingType.set('anomalia');
    this.editObservacion = record['observacion'] ?? '';
    this.editTipo = record['tipo'] ?? '';
  }

  cancelEdit(): void {
    this.editingRecord.set(null);
    this.editingType.set(null);
  }

  async saveEditReading(): Promise<void> {
    const record = this.editingRecord();
    if (!record?.id) return;

    const consumo = this.editLecturaInicial
      ? this.editLecturaActual
      : this.editLecturaActual - this.editLecturaAnterior;

    await this.dbService.updatePendingReading(record.id, {
      lecturaActual: this.editLecturaActual,
      lecturaAnterior: this.editLecturaAnterior,
      lecturaInicial: this.editLecturaInicial,
      consumoCalculado: consumo,
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

  async saveEditAnomaly(): Promise<void> {
    const record = this.editingRecord();
    if (!record?.id) return;

    await this.dbService.updatePendingAnomaly(record.id, {
      observacion: this.editObservacion,
      tipo: this.editTipo,
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
      })
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
      })
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
