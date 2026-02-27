export type TrendDirection = 'up' | 'down' | 'neutral';

export interface MetricCard {
  id: string;
  title: string;
  value: number | string;
  unit?: string;
  trend: TrendDirection;
  trendValue: number;
  icon: string;
  colorClass: string;
}

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  delinquentClients: number;
  pendingReadings: number;
  totalConsumption: number;
  averageConsumption: number;
}
