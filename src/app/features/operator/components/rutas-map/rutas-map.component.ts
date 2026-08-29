import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { NetworkService } from '../../../../core/services/network.service';
import { MARKER_COLORS, TIPO_ICONS } from '../../rutas/rutas.constants';

export interface MapPoint {
  routeId: string;
  lat: number;
  lng: number;
  estado: string;
  tipoRuta: string;
  popupHtml: string;
}

@Component({
  selector: 'app-rutas-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="map-view-wrapper">
      @if (isDegradedMap()) {
        <div class="offline-map-banner" role="status">
          <i class="bi bi-cloud-slash"></i>
          <span>Modo mapa offline · Las imágenes pueden no estar disponibles</span>
        </div>
      }
      <div id="map" class="rutas-map-canvas"></div>
      <button
        class="btn-center-user"
        (click)="centerOnUser()"
        aria-label="Centrar en mi ubicación"
        title="Mi ubicación"
      >
        <i class="bi bi-crosshair"></i>
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .map-view-wrapper {
        position: relative;
        width: 100%;
        height: calc(100vh - 200px);
        min-height: 400px;
        border-radius: 16px;
        overflow: hidden;
      }
      .rutas-map-canvas {
        width: 100%;
        height: 100%;
      }
      .offline-map-banner {
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        background: rgba(15, 23, 42, 0.85);
        color: #fff;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        gap: 6px;
        backdrop-filter: blur(4px);
      }
      .btn-center-user {
        position: absolute;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--white, #fff);
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        color: var(--primary-color, #0c9ea1);
        font-size: 1.2rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      }
      .btn-center-user:active {
        transform: scale(0.92);
      }
    `,
  ],
})
export class RutasMapComponent implements OnInit, OnDestroy, OnChanges {
  private readonly networkService = inject(NetworkService);

  @Input() points: MapPoint[] = [];
  @Output() pointSelected = new EventEmitter<string>();

  private map?: L.Map;
  private markersGroup?: L.LayerGroup;
  private userMarker?: L.Marker;
  private geoWatchId?: number;
  private consecutiveTileErrors = 0;

  readonly tileLayerUnavailable = signal<boolean>(false);
  readonly isDegradedMap = computed(
    () => !this.networkService.isOnline() || this.tileLayerUnavailable(),
  );

  ngOnInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points'] && !changes['points'].firstChange && this.map) {
      this.renderPoints();
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  private initMap(): void {
    this.destroyMap();
    this.tileLayerUnavailable.set(false);

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const center: L.LatLngExpression = this.points[0]
      ? [this.points[0].lat, this.points[0].lng]
      : [-0.9677, -80.7089];

    this.map = L.map('map').setView(center, 14);

    if (this.networkService.isOnline()) {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      })
        .on('tileerror', () => {
          this.consecutiveTileErrors += 1;
          if (this.consecutiveTileErrors >= 5) {
            this.tileLayerUnavailable.set(true);
          }
        })
        .on('tileload', () => {
          this.consecutiveTileErrors = 0;
          if (this.networkService.isOnline()) {
            this.tileLayerUnavailable.set(false);
          }
        })
        .addTo(this.map);
    }

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.renderPoints();
    this.startGeoWatch();
  }

  private renderPoints(): void {
    if (!this.markersGroup || !this.map) return;
    this.markersGroup.clearLayers();

    const routeLines = new Map<string, L.LatLngTuple[]>();
    for (const point of this.points) {
      const line = routeLines.get(point.routeId) ?? [];
      line.push([point.lat, point.lng]);
      routeLines.set(point.routeId, line);
    }

    for (const line of routeLines.values()) {
      if (line.length < 2) continue;
      L.polyline(line, {
        color: '#0f7375',
        weight: 4,
        opacity: 0.8,
        dashArray: this.isDegradedMap() ? '8 8' : undefined,
      }).addTo(this.markersGroup);
    }

    this.points.forEach((point) => {
      const color = MARKER_COLORS[point.estado] ?? '#9ca3af';
      const iconClass = TIPO_ICONS[point.tipoRuta] ?? 'bi-geo-alt-fill';
      const icon = L.divIcon({
        html: `<div class="map-type-marker" style="background:${color}"><i class="bi ${iconClass}"></i></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([point.lat, point.lng], { icon })
        .bindPopup(point.popupHtml)
        .addTo(this.markersGroup!);

      marker.on('click', () => {
        this.pointSelected.emit(point.routeId);
      });
    });

    if (this.points.length > 1) {
      const bounds = L.latLngBounds(this.points.map((p) => [p.lat, p.lng] as L.LatLngTuple));
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  private startGeoWatch(): void {
    if (!navigator.geolocation) return;
    this.geoWatchId = navigator.geolocation.watchPosition(
      (pos) => this.updateUserMarker(pos.coords.latitude, pos.coords.longitude),
      () => {
        /* permiso denegado o error GPS — silencioso */
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }

  private updateUserMarker(lat: number, lng: number): void {
    if (!this.map) return;
    const icon = L.divIcon({
      html: `<div class="map-user-marker"><i class="bi bi-person-fill"></i></div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lng]);
    } else {
      this.userMarker = L.marker([lat, lng], { icon }).addTo(this.map);
    }
  }

  centerOnUser(): void {
    if (this.userMarker && this.map) {
      this.map.setView(this.userMarker.getLatLng(), 16);
    }
  }

  private destroyMap(): void {
    if (this.geoWatchId !== undefined) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = undefined;
    }
    this.userMarker = undefined;
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.markersGroup = undefined;
    }
  }
}
