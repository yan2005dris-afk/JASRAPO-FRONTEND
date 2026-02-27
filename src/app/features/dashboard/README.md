# Dashboard Feature

Modular Angular dashboard for the JAPO water management system.

## Structure

```
dashboard/
├── models/
│   ├── dashboard.models.ts   # Client, ClientFilter, PaginationState interfaces
│   └── metrics.model.ts      # MetricCard, DashboardStats interfaces
├── constants/
│   └── dashboard.constants.ts # Mock data and static config
├── services/
│   ├── dashboard.service.ts  # Client filtering, search, pagination state
│   └── metrics.service.ts    # Stats calculation and metrics signals
├── components/
│   ├── metric-card/          # Single KPI card
│   ├── metrics-grid/         # Responsive grid of metric cards
│   ├── recent-clients/       # Client table with search and filters
│   └── stats-summary/        # Consumption and pending readings summary
├── dashboard.component.ts    # Main orchestrator component
└── README.md
```

## Components

| Component | Selector | Inputs | Outputs |
|---|---|---|---|
| `MetricCardComponent` | `app-metric-card` | `card: MetricCard` | — |
| `MetricsGridComponent` | `app-metrics-grid` | `metrics: MetricCard[]` | — |
| `RecentClientsComponent` | `app-recent-clients` | `clients`, `filters`, `activeFilter` | `filterChanged`, `searchChanged` |
| `StatsSummaryComponent` | `app-stats-summary` | `stats: DashboardStats` | — |
| `DashboardComponent` | `app-dashboard` | — | — |

## Route

```ts
{
  path: 'dashboard',
  loadComponent: () =>
    import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
}
```
