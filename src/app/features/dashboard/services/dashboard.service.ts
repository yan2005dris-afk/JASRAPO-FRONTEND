import { Injectable, signal, computed } from '@angular/core';
import { Client, ClientFilter, PaginationState } from '../models/dashboard.models';
import { MOCK_CLIENTS, CLIENT_FILTERS, ITEMS_PER_PAGE } from '../constants/dashboard.constants';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly clientsSignal = signal<Client[]>(MOCK_CLIENTS);
  private readonly activeFilterSignal = signal<string>('Todos');
  private readonly searchQuerySignal = signal<string>('');
  private readonly paginationSignal = signal<PaginationState>({
    currentPage: 1,
    totalItems: MOCK_CLIENTS.length,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  readonly clients = computed(() => this.clientsSignal());
  readonly activeFilter = computed(() => this.activeFilterSignal());
  readonly searchQuery = computed(() => this.searchQuerySignal());
  readonly filters: ClientFilter[] = CLIENT_FILTERS;

  readonly filteredClients = computed(() => {
    const query = this.searchQuerySignal().toLowerCase();
    const filter = this.activeFilterSignal();
    return this.clientsSignal().filter(client => {
      const matchesSearch =
        !query ||
        client.nombre.toLowerCase().includes(query) ||
        client.sector.toLowerCase().includes(query);
      const matchesFilter =
        filter === 'Todos' ||
        (filter === 'Morosos' && client.estado === 'Moroso') ||
        (filter === 'Sin Lectura' && client.estado === 'Sin lectura');
      return matchesSearch && matchesFilter;
    });
  });

  readonly pagination = computed(() => this.paginationSignal());

  setFilter(filter: string): void {
    this.activeFilterSignal.set(filter);
  }

  setSearchQuery(query: string): void {
    this.searchQuerySignal.set(query);
  }

  setPage(page: number): void {
    this.paginationSignal.update(state => ({ ...state, currentPage: page }));
  }
}
