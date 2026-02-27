import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from './services/dashboard.service';
import { MetricsService } from './services/metrics.service';
import { MetricsGridComponent } from './components/metrics-grid/metrics-grid.component';
import { RecentClientsComponent } from './components/recent-clients/recent-clients.component';
import { StatsSummaryComponent } from './components/stats-summary/stats-summary.component';
import { MOCK_CLIENTS } from './constants/dashboard.constants';

@Component({
  selector: 'app-dashboard',
  imports: [MetricsGridComponent, RecentClientsComponent, StatsSummaryComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly metricsService = inject(MetricsService);

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly metrics = computed(() => this.metricsService.metrics());
  readonly stats = computed(() => this.metricsService.stats());
  readonly filteredClients = computed(() => this.dashboardService.filteredClients());
  readonly filters = this.dashboardService.filters;
  readonly activeFilter = computed(() => this.dashboardService.activeFilter());

  constructor() {
    this.metricsService.updateStats(MOCK_CLIENTS);
  }

  onFilterChanged(filter: string): void {
    this.dashboardService.setFilter(filter);
  }

  onSearchChanged(query: string): void {
    this.dashboardService.setSearchQuery(query);
  }
}
