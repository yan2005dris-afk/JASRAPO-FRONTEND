import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface Client {
  id: number;
  nombre: string;
  sector: string;
  consumo: number;
  estado: 'Activo' | 'Sin lectura' | 'Moroso';
}

@Component({
  selector: 'app-client-management',
  imports: [CommonModule],
  templateUrl: './client-management.html',
  styleUrl: './client-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientManagement {
  readonly authService = inject(AuthService);

  clients: Client[] = [
    { id: 1, nombre: 'Ana María Torres', sector: 'Centro', consumo: 125, estado: 'Activo' },
    { id: 2, nombre: 'Juan Carlos Mena', sector: 'Norte', consumo: 0, estado: 'Sin lectura' },
    { id: 3, nombre: 'Sofía Ledesma', sector: 'Sur', consumo: 80, estado: 'Moroso' },
    { id: 4, nombre: 'Pedro Ramírez', sector: 'Centro', consumo: 95, estado: 'Activo' },
    { id: 5, nombre: 'Elena Villacís', sector: 'Norte', consumo: 150, estado: 'Activo' }
  ];

  activeFilter = 'Todos';

  setFilter(filter: string) {
    this.activeFilter = filter;
  }
}
