import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NetworkService } from '../../core/services/network.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-operator-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './operator-layout.component.html',
  styleUrl: './operator-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorLayoutComponent implements OnInit {
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Sincronización automática de catálogo y lecturas apenas inicia sesión el operario
    if (this.networkService.isOnline()) {
      this.syncService.syncCatalogAndReadings().catch((err) => {
        console.error('Error al sincronizar datos iniciales del operador:', err);
      });
    }
  }

  // Getter para el usuario actual
  get user() {
    return this.authService.currentUser();
  }

  // Ejecuta la sincronización manual si el operador lo desea
  async forceSync(): Promise<void> {
    if (this.networkService.isOnline() && this.syncService.totalPending() > 0) {
      await this.syncService.syncPendingData();
    }
  }

  // Cerrar sesión
  onLogout(): void {
    this.authService.logout();
  }
}
