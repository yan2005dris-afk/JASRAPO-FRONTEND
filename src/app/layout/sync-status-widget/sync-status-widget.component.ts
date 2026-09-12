import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NetworkService } from '../../core/services/network.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';

@Component({
  selector: 'app-sync-status-widget',
  imports: [CommonModule],
  templateUrl: './sync-status-widget.component.html',
  styleUrl: './sync-status-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncStatusWidgetComponent {
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);

  async forceSync(): Promise<void> {
    if (this.networkService.isOnline() && this.syncService.totalPending() > 0) {
      await this.syncService.syncPendingData();
    }
  }
}
