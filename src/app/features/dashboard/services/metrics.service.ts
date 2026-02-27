import { Injectable, signal, computed } from '@angular/core';
import { DashboardStats, MetricCard } from '../models/metrics.model';
import { Client } from '../models/dashboard.models';
import { MOCK_METRICS, MOCK_STATS } from '../constants/dashboard.constants';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly statsSignal = signal<DashboardStats>(MOCK_STATS);
  private readonly metricsSignal = signal<MetricCard[]>(MOCK_METRICS);

  readonly stats = computed(() => this.statsSignal());
  readonly metrics = computed(() => this.metricsSignal());

  calculateStats(clients: Client[]): DashboardStats {
    const active = clients.filter(c => c.estado === 'Activo');
    const delinquent = clients.filter(c => c.estado === 'Moroso');
    const pending = clients.filter(c => c.estado === 'Sin lectura');
    const totalConsumption = clients.reduce((sum, c) => sum + c.consumo, 0);

    return {
      totalClients: clients.length,
      activeClients: active.length,
      delinquentClients: delinquent.length,
      pendingReadings: pending.length,
      totalConsumption,
      averageConsumption: clients.length > 0 ? Math.round(totalConsumption / clients.length) : 0,
    };
  }

  updateStats(clients: Client[]): void {
    this.statsSignal.set(this.calculateStats(clients));
  }
}
