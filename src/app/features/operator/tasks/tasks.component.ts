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
import { Router } from '@angular/router';
import { OperatorService } from '../service/operator.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import type { TaskResponse } from '../models/operator.models';
import * as L from 'leaflet';

type ViewMode = 'list' | 'map';

const MARKER_COLORS: Record<string, string> = {
  PENDIENTE:              '#f59e0b',
  POR_REVISION:           '#f59e0b',
  RECHAZADA_VERIFICACION: '#ef4444',
  APROBADA:               '#10b981',
  ESTIMADA:               '#10b981',
  PLANILLADA:             '#10b981',
};

const TIPO_ICONS: Record<string, string> = {
  TOMA_LECTURA: 'bi-droplet-fill',
  INSTALACION:  'bi-tools',
  INSPECCION:   'bi-search',
  RECONEXION:   'bi-plug-fill',
};

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
  private readonly dbService = inject(IndexedDbService);
  private readonly router = inject(Router);

  private map?: L.Map;
  private markersGroup?: L.LayerGroup;

  readonly tasks = signal<TaskResponse[]>([]);
  readonly activeFilter = signal<string>('ALL');
  readonly viewMode = signal<ViewMode>('list');
  readonly isLoading = signal<boolean>(false);
  readonly selectedTaskId = signal<string | null>(null);
  readonly readingStatusBySerie = signal<Map<string, string>>(new Map());

  readonly filteredTasks = computed<TaskResponse[]>(() => {
    const filter = this.activeFilter();
    if (filter === 'ALL') return this.tasks();
    return this.tasks().filter((t) => t.tipoRuta === filter);
  });

  readonly mapPoints = computed<
    { lat: number; lng: number; estado: string; tipoRuta: string; popupHtml: string }[]
  >(() => {
    const points: { lat: number; lng: number; estado: string; tipoRuta: string; popupHtml: string }[] = [];
    const activeSelectedId = this.selectedTaskId();
    const statusMap = this.readingStatusBySerie();

    const sortedTasks = this.filteredTasks()
      .slice()
      .sort((a, b) => a.orden - b.orden);

    for (const task of sortedTasks) {
      if (activeSelectedId !== null && task.rutaId !== activeSelectedId) continue;

      if (task.tipoRuta === 'TOMA_LECTURA' && task.rutaPuntos?.length) {
        for (const pt of task.rutaPuntos) {
          points.push({
            lat: pt.latitud,
            lng: pt.longitud,
            estado: statusMap.get(pt.serie) ?? '__SIN_LECTURA__',
            tipoRuta: task.tipoRuta,
            popupHtml: `
              <div class="map-info">
                <strong>${task.nombre}</strong>
                <p style="margin:4px 0 0;font-size:11px;"><strong>Serie:</strong> ${pt.serie}</p>
                <p style="margin:2px 0 0;font-size:11px;"><strong>Cliente:</strong> ${pt.clienteNombre}</p>
              </div>
            `,
          });
        }
      } else if (task.medidor?.latitud != null && task.medidor?.longitud != null) {
        points.push({
          lat: task.medidor.latitud,
          lng: task.medidor.longitud,
          estado: statusMap.get(task.medidor.serie) ?? '__SIN_LECTURA__',
          tipoRuta: task.tipoRuta,
          popupHtml: `
            <div class="map-info">
              <strong>${task.nombre}</strong>
              <p style="margin:4px 0 0;font-size:11px;"><strong>Serie:</strong> ${task.medidor.serie}</p>
              ${task.descripcion ? `<p style="margin:2px 0 0;font-size:10px;color:#597b7d;">${task.descripcion}</p>` : ''}
            </div>
          `,
        });
      }
    }

    return points;
  });

  ngOnInit(): void {
    this.loadTasks();
    this.loadReadingStatuses();
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
        if (this.viewMode() === 'map') this.initMap();
      },
      error: () => this.isLoading.set(false),
    });
  }

  private async loadReadingStatuses(): Promise<void> {
    try {
      const [meters, registered, pending] = await Promise.all([
        this.dbService.getMetersCache(),
        this.dbService.getRegisteredReadingsCache(),
        this.dbService.getPendingReadings(),
      ]);

      const serieToId = new Map<string, string>();
      for (const m of meters) {
        serieToId.set(m.serie, m.medidorId.toString());
      }

      const idToEstado = new Map<string, string>();
      for (const r of registered) {
        if (r.medidorId) idToEstado.set(r.medidorId.toString(), r.estado);
      }
      for (const p of pending) {
        const pId = p['medidorId'];
        const pEstado = p['estado'];
        if (pId && !idToEstado.has(pId.toString())) {
          idToEstado.set(pId.toString(), pEstado ?? 'PENDIENTE');
        }
      }

      const statusMap = new Map<string, string>();
      for (const [serie, id] of serieToId) {
        const estado = idToEstado.get(id);
        if (estado) statusMap.set(serie, estado);
      }

      this.readingStatusBySerie.set(statusMap);
    } catch {
      // empty cache — leave map empty, all markers gray
    }
  }

  setFilter(tipo: string): void {
    this.activeFilter.set(tipo);
    this.selectedTaskId.set(null);
    if (this.viewMode() === 'map') setTimeout(() => this.initMap(), 0);
  }

  toggleView(): void {
    const newMode = this.viewMode() === 'list' ? 'map' : 'list';
    this.viewMode.set(newMode);

    if (newMode === 'map') {
      setTimeout(() => this.initMap(), 0);
    } else {
      this.selectedTaskId.set(null);
      this.destroyMap();
    }
  }

  selectTask(taskId: string | null): void {
    this.selectedTaskId.set(taskId);
    if (this.viewMode() === 'map') this.initMap();
  }

  viewOnMap(task: TaskResponse): void {
    this.selectedTaskId.set(task.rutaId);
    this.viewMode.set('map');
    setTimeout(() => this.initMap(), 0);
  }

  openRoute(task: TaskResponse, event: Event): void {
    event.preventDefault();

    const queryParams: Record<string, string> = {
      rutaNombre: task.nombre,
      rutaTipo: task.tipoRuta,
    };

    if (task.tipoRuta === 'TOMA_LECTURA' && task.rutaPuntos?.length) {
      queryParams['series'] = task.rutaPuntos.map((pt) => pt.serie).join(',');
    } else if (task.medidor) {
      queryParams['serie'] = task.medidor.serie;
    }

    this.router.navigate(['/app/operador/lecturas'], { queryParams });
  }

  private initMap(): void {
    this.destroyMap();

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const points = this.mapPoints();
    const center: L.LatLngExpression =
      points[0] ? [points[0].lat, points[0].lng] : [-0.9677, -80.7089];

    this.map = L.map('map').setView(center, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);

    points.forEach((point) => {
      const color = MARKER_COLORS[point.estado] ?? '#9ca3af';
      const iconClass = TIPO_ICONS[point.tipoRuta] ?? 'bi-geo-alt-fill';
      const icon = L.divIcon({
        html: `<div class="map-type-marker" style="background:${color}"><i class="bi ${iconClass}"></i></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
      });

      L.marker([point.lat, point.lng], { icon })
        .bindPopup(point.popupHtml)
        .addTo(this.markersGroup!);
    });

    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngTuple));
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.markersGroup = undefined;
    }
  }

  readonly filterOptions: { label: string; value: string }[] = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Lecturas', value: 'TOMA_LECTURA' },
    { label: 'Reconexión', value: 'RECONEXION' },
    { label: 'Instalación', value: 'INSTALACION' },
    { label: 'Inspección', value: 'INSPECCION' },
  ];

  readonly routeTypeLabelMap: Record<string, string> = {
    TOMA_LECTURA: 'Lectura',
    RECONEXION:   'Reconexión',
    INSTALACION:  'Instalación',
    INSPECCION:   'Inspección',
  };

  readonly stateLabelMap: Record<string, string> = {
    PENDIENTE:   'Pendiente',
    EN_PROGRESO: 'En Progreso',
    COMPLETADA:  'Completada',
    CANCELADA:   'Cancelada',
  };

  getRouteTypeLabel(tipoRuta: string): string {
    return this.routeTypeLabelMap[tipoRuta] ?? tipoRuta;
  }

  getStateLabel(estado: string): string {
    return this.stateLabelMap[estado] ?? estado;
  }
}
