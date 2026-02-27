import { Client, ClientFilter } from '../models/dashboard.models';
import { DashboardStats, MetricCard } from '../models/metrics.model';

export const MOCK_CLIENTS: Client[] = [
  { id: 1, nombre: 'Ana María Torres', sector: 'Centro', consumo: 125, estado: 'Activo' },
  { id: 2, nombre: 'Juan Carlos Mena', sector: 'Norte', consumo: 0, estado: 'Sin lectura' },
  { id: 3, nombre: 'Sofía Ledesma', sector: 'Sur', consumo: 80, estado: 'Moroso' },
  { id: 4, nombre: 'Pedro Ramírez', sector: 'Centro', consumo: 95, estado: 'Activo' },
  { id: 5, nombre: 'Elena Villacís', sector: 'Norte', consumo: 150, estado: 'Activo' },
  { id: 6, nombre: 'Luis Herrera', sector: 'Sur', consumo: 60, estado: 'Activo' },
];

export const CLIENT_FILTERS: ClientFilter[] = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Morosos', value: 'Morosos' },
  { label: 'Sin Lectura', value: 'Sin Lectura' },
];

export const ITEMS_PER_PAGE = 10;

export const MOCK_STATS: DashboardStats = {
  totalClients: 6,
  activeClients: 4,
  delinquentClients: 1,
  pendingReadings: 1,
  totalConsumption: 510,
  averageConsumption: 85,
};

export const MOCK_METRICS: MetricCard[] = [
  {
    id: 'total-clients',
    title: 'Total Clientes',
    value: 6,
    trend: 'up',
    trendValue: 5,
    icon: 'bi bi-people-fill',
    colorClass: 'metric-blue',
  },
  {
    id: 'active-clients',
    title: 'Clientes Activos',
    value: 4,
    trend: 'up',
    trendValue: 2,
    icon: 'bi bi-check-circle-fill',
    colorClass: 'metric-green',
  },
  {
    id: 'delinquent',
    title: 'Morosos',
    value: 1,
    trend: 'down',
    trendValue: 1,
    icon: 'bi bi-exclamation-triangle-fill',
    colorClass: 'metric-red',
  },
  {
    id: 'consumption',
    title: 'Consumo Promedio',
    value: 85,
    unit: 'm³',
    trend: 'neutral',
    trendValue: 0,
    icon: 'bi bi-droplet-fill',
    colorClass: 'metric-cyan',
  },
];
