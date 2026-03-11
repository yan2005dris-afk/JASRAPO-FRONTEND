import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface Client {
  id: number;
  nombre: string;
  sector: string;
  consumo: number;
  estado: 'Activo' | 'Sin lectura' | 'Moroso';
}

// ---------------------------------------------------------------------------
// Datos estáticos que simulan la respuesta de una API real.
// En el futuro, esto se reemplazará por un servicio que haga un fetch real.
// ---------------------------------------------------------------------------
const MOCK_CLIENTS: Client[] = [
  { id: 1, nombre: 'Ana María Torres', sector: 'Centro', consumo: 125, estado: 'Activo' },
  { id: 2, nombre: 'Juan Carlos Mena', sector: 'Norte', consumo: 0, estado: 'Sin lectura' },
  { id: 3, nombre: 'Sofía Ledesma', sector: 'Sur', consumo: 80, estado: 'Moroso' },
  { id: 4, nombre: 'Pedro Ramírez', sector: 'Centro', consumo: 95, estado: 'Activo' },
  { id: 5, nombre: 'Elena Villacís', sector: 'Norte', consumo: 150, estado: 'Activo' },
];

@Component({
  selector: 'app-clientes',
  imports: [CommonModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Clientes {
  readonly authService = inject(AuthService);

  private readonly cdr = inject(ChangeDetectorRef);
  // -------------------------------------------------------------------------
  // Estado del componente
  // -------------------------------------------------------------------------

  /** Lista de clientes que se muestra en la tabla. Empieza vacía. */
  clients: Client[] = [];

  /** Indica si se está realizando una petición a la API. */
  isLoading = false;

  /** Indica si ya se ha realizado al menos una búsqueda (sea exitosa o no). */
  hasFetched = false;

  // -------------------------------------------------------------------------
  // Métodos
  // -------------------------------------------------------------------------
  /**
   * Simula un fetch a una API usando un array estático.
   * Se llama únicamente desde el botón "Buscar" en el template.
   *
   * Patrón a seguir en otros módulos:
   *   1. Marcar isLoading = true.
   *   2. Llamar al servicio (o simular con setTimeout).
   *   3. Asignar el resultado a la propiedad del componente.
   *   4. Marcar hasFetched = true para que la tabla sea visible.
   *   5. Marcar isLoading = false.
   */
  buscarClientes(): void {
    // Evitar una segunda llamada si ya se cargaron los datos
    if (this.hasFetched) return;
    this.isLoading = true;
    // simulamos la latencia de red con un timeout de 800 ms
    setTimeout(() => {
      this.clients = MOCK_CLIENTS;   // ← aquí irá: this.clienteService.getAll()
      this.hasFetched = true;
      this.isLoading = false;
      // Con OnPush, Angular no detecta cambios dentro de callbacks asíncronos
      // a menos que le avisemos explícitamente.
      this.cdr.markForCheck();
    }, 800);


  }

  activeFilter = 'Todos';

  setFilter(filter: string) {
    this.activeFilter = filter;
  }
}
