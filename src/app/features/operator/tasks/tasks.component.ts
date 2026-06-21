import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorService } from '../service/operator.service';
import type { TaskResponse, TaskRouteType } from '../models/operator.models';
import * as L from 'leaflet';

type ViewMode = 'list' | 'map';

@Component({
  selector: 'app-tasks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent implements OnInit, OnDestroy {
  private readonly operatorService = inject(OperatorService);

  private map?: L.Map;
  private markersGroup?: L.LayerGroup;
  private polyline?: L.Polyline;

  readonly tasks = signal<TaskResponse[]>([]);
  readonly activeFilter = signal<string>('ALL');
  readonly viewMode = signal<ViewMode>('list');
  readonly isLoading = signal<boolean>(false);

  readonly filteredTasks = computed<TaskResponse[]>(() => {
    const filter = this.activeFilter();
    if (filter === 'ALL') return this.tasks();
    return this.tasks().filter((t) => t.tipoRuta === filter);
  });

  readonly tasksWithCoords = computed<TaskResponse[]>(() =>
    this.filteredTasks().filter((t) => t.medidor?.latitud != null && t.medidor?.longitud != null),
  );

  readonly routePath = computed<L.LatLngTuple[]>(() =>
    this.tasksWithCoords()
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((t) => [t.medidor!.latitud!, t.medidor!.longitud!] as L.LatLngTuple),
  );

  ngOnInit(): void {
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  loadTasks(): void {
    this.isLoading.set(true);
    this.operatorService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.isLoading.set(false);
        if (this.viewMode() === 'map') {
          this.initMap();
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  setFilter(tipo: string): void {
    this.activeFilter.set(tipo);
    if (this.viewMode() === 'map') {
      setTimeout(() => {
        this.initMap();
      }, 0);
    }
  }

  toggleView(): void {
    const newMode = this.viewMode() === 'list' ? 'map' : 'list';
    this.viewMode.set(newMode);

    if (newMode === 'map') {
      setTimeout(() => {
        this.initMap();
      }, 0);
    } else {
      this.destroyMap();
    }
  }

  private initMap(): void {
    this.destroyMap();

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Default center: Manabí (-0.9677, -80.7089)
    let center: L.LatLngExpression = [-0.9677, -80.7089];

    const firstTask = this.tasksWithCoords()[0];
    if (firstTask?.medidor?.latitud != null && firstTask?.medidor?.longitud != null) {
      center = [firstTask.medidor.latitud, firstTask.medidor.longitud];
    }

    this.map = L.map('map').setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    const defaultIcon = L.icon({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.markersGroup = L.layerGroup().addTo(this.map);

    this.tasksWithCoords().forEach((task) => {
      if (task.medidor?.latitud != null && task.medidor?.longitud != null) {
        const marker = L.marker([task.medidor.latitud, task.medidor.longitud], {
          icon: defaultIcon,
        }).bindPopup(`
          <div class="map-info">
            <strong>#${task.orden} — ${task.nombre}</strong>
            <div style="margin-top: 4px; margin-bottom: 4px;">
              <span class="route-badge badge-${task.tipoRuta.toLowerCase()}" style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #e0f0ff; color: #0a58ca;">
                ${this.getRouteTypeLabel(task.tipoRuta)}
              </span>
              <span class="state-badge state-${task.estado.toLowerCase()}" style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-left: 4px;">
                ${this.getStateLabel(task.estado)}
              </span>
            </div>
            ${task.medidor ? `<p style="margin: 4px 0 0 0; font-size: 11px;">Serie: ${task.medidor.serie}</p>` : ''}
            ${task.descripcion ? `<p style="margin: 2px 0 0 0; font-size: 10px; color: #6c757d;">${task.descripcion}</p>` : ''}
          </div>
        `);

        marker.bindTooltip(task.orden.toString(), {
          permanent: true,
          direction: 'top',
          className: 'marker-tooltip-label',
        });

        this.markersGroup?.addLayer(marker);
      }
    });

    const latLngs = this.routePath();
    if (latLngs.length > 0) {
      this.polyline = L.polyline(latLngs, {
        color: '#0d6efd',
        weight: 3,
        opacity: 0.8,
      }).addTo(this.map);
    }
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.markersGroup = undefined;
      this.polyline = undefined;
    }
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
