import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorService } from '../service/operator.service';
import type { TaskResponse, TaskRouteType } from '../models/operator.models';

type ViewMode = 'list' | 'map';

@Component({
  selector: 'app-tasks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent implements OnInit {
  private readonly operatorService = inject(OperatorService);

  readonly tasks = signal<TaskResponse[]>([]);
  readonly activeFilter = signal<string>('ALL');
  readonly viewMode = signal<ViewMode>('list');
  readonly isLoading = signal<boolean>(false);

  readonly filteredTasks = computed<TaskResponse[]>(() => {
    const filter = this.activeFilter();
    if (filter === 'ALL') return this.tasks();
    return this.tasks().filter((t) => t.tipoRuta === filter);
  });

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading.set(true);
    this.operatorService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  setFilter(tipo: string): void {
    this.activeFilter.set(tipo);
  }

  toggleView(): void {
    this.viewMode.set(this.viewMode() === 'list' ? 'map' : 'list');
  }

  readonly filterOptions: Array<{ label: string; value: string }> = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Lecturas', value: 'TOMA_LECTURA' },
    { label: 'Reconexión', value: 'RECONEXION' },
    { label: 'Instalación', value: 'INSTALACION' },
    { label: 'Inspección', value: 'INSPECCION' },
  ];

  readonly routeTypeLabelMap: Record<string, string> = {
    TOMA_LECTURA: 'Lectura',
    RECONEXION: 'Reconexión',
    INSTALACION: 'Instalación',
    INSPECCION: 'Inspección',
  };

  readonly stateLabelMap: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    EN_PROGRESO: 'En Progreso',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',
  };

  getRouteTypeLabel(tipoRuta: string): string {
    return this.routeTypeLabelMap[tipoRuta] ?? tipoRuta;
  }

  getStateLabel(estado: string): string {
    return this.stateLabelMap[estado] ?? estado;
  }
}
