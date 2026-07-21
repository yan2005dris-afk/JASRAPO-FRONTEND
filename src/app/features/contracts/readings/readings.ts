import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Lectura de consumo tal como devuelve el endpoint admin */
interface AdminReadingItem {
  lecturaId: string;
  medidorId: string;
  medidorSerie: string;
  clienteNombre?: string;
  clienteId?: string;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoCalculado?: number;
  fecha: string;
  estado: string;
  descripcionAnomalia?: string;
}

type EstadoFilter = 'TODOS' | 'PENDIENTE' | 'POR_REVISION' | 'APROBADA' | 'RECHAZADA_VERIFICACION' | 'ESTIMADA' | 'PLANILLADA' | 'CON_NOVEDAD';

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:              '#6b7280',
  POR_REVISION:           '#f59e0b',
  APROBADA:               '#22c55e',
  RECHAZADA_VERIFICACION: '#ef4444',
  ESTIMADA:               '#3b82f6',
  PLANILLADA:             '#8b5cf6',
  CON_NOVEDAD:            '#f97316',
};

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE:              'Pendiente',
  POR_REVISION:           'Por Revisión',
  APROBADA:               'Aprobada',
  RECHAZADA_VERIFICACION: 'Rechazada',
  ESTIMADA:               'Estimada',
  PLANILLADA:             'Planillada',
  CON_NOVEDAD:            'Con Novedad',
};

@Component({
  selector: 'app-readings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './readings.html',
  styleUrl: './readings.scss',
})
export class ReadingsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/readings`;

  readonly readings = signal<AdminReadingItem[]>([]);
  readonly isLoading = signal(false);
  readonly searchQuery = signal('');
  readonly activeFilter = signal<EstadoFilter>('TODOS');
  readonly error = signal<string | null>(null);

  readonly estadoColors = ESTADO_COLORS;
  readonly estadoLabels = ESTADO_LABELS;

  readonly filterOptions: { value: EstadoFilter; label: string }[] = [
    { value: 'TODOS',                  label: 'Todos' },
    { value: 'PENDIENTE',              label: 'Pendiente' },
    { value: 'POR_REVISION',           label: 'Por Revisión' },
    { value: 'APROBADA',               label: 'Aprobada' },
    { value: 'RECHAZADA_VERIFICACION', label: 'Rechazada' },
    { value: 'ESTIMADA',               label: 'Estimada' },
    { value: 'PLANILLADA',             label: 'Planillada' },
    { value: 'CON_NOVEDAD',            label: 'Con Novedad' },
  ];

  readonly filteredReadings = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.activeFilter();
    return this.readings().filter((r) => {
      const matchesFilter = filter === 'TODOS' || r.estado === filter;
      const matchesSearch = !query ||
        r.medidorSerie?.toLowerCase().includes(query) ||
        r.clienteNombre?.toLowerCase().includes(query) ||
        r.estado?.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  });

  readonly totalByEstado = computed(() => {
    const counts: Record<string, number> = {};
    for (const r of this.readings()) {
      counts[r.estado] = (counts[r.estado] ?? 0) + 1;
    }
    return counts;
  });

  ngOnInit(): void {
    this.loadReadings();
  }

  async loadReadings(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<AdminReadingItem[]>(`${this.apiUrl}`)
      );
      this.readings.set(data);
    } catch (err) {
      console.error('Error al cargar lecturas:', err);
      this.error.set('No se pudieron cargar las lecturas. Intente nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  setFilter(filter: EstadoFilter): void {
    this.activeFilter.set(filter);
  }

  getEstadoLabel(estado: string): string {
    return ESTADO_LABELS[estado] ?? estado;
  }

  getEstadoColor(estado: string): string {
    return ESTADO_COLORS[estado] ?? '#9ca3af';
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-EC', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
