import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { Client, ClientFilter } from '../../models/dashboard.models';

@Component({
  selector: 'app-recent-clients',
  templateUrl: './recent-clients.component.html',
  styleUrl: './recent-clients.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentClientsComponent {
  readonly clients = input.required<Client[]>();
  readonly filters = input<ClientFilter[]>([]);
  readonly activeFilter = input<string>('Todos');

  readonly filterChanged = output<string>();
  readonly searchChanged = output<string>();

  onFilterClick(value: string): void {
    this.filterChanged.emit(value);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchChanged.emit(input.value);
  }

  getStatusClass(estado: Client['estado']): string {
    const map: Record<Client['estado'], string> = {
      Activo: 'badge-soft-success',
      'Sin lectura': 'badge-soft-warning',
      Moroso: 'badge-soft-danger',
    };
    return map[estado];
  }
}
