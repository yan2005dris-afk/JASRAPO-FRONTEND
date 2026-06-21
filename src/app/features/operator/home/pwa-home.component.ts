import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';

@Component({
  selector: 'app-pwa-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pwa-home.component.html',
  styleUrl: './pwa-home.component.scss',
})
export class PwaHomeComponent implements OnInit {
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);

  ngOnInit(): void {
    this.syncService.refreshPendingCounts();

    // Sync inicial: una sola vez por sesión, descarga catálogo + lecturas para offline
    if (this.networkService.isOnline() && this.syncService.needsInitialSync()) {
      this.syncService.syncCatalogAndReadings();
    }
  }

  async forceSync(): Promise<void> {
    await this.syncService.syncPendingData();
  }
}
