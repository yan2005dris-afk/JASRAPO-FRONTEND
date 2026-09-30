import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  input,
  output,
  viewChild,
  ElementRef,
  effect,
  untracked,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { NetworkService } from '../../../../core/services/network.service';
import { formatDistance, type LatLng } from '../../../../shared/utils/geo.utils';
import { MARKER_COLORS } from '../../rutas/rutas.constants';

export interface MapPoint {
  routeId: string;
  lat: number;
  lng: number;
  estado: string;
  tipoRuta: string;
  icon?: string;
  popupHtml: string;
  /** Stable identity of the source point (e.g. `<routeId>:<ordenTrabajoId>`), used to match the next-stop marker. */
  pointKey?: string;
}

/** Appends a live distance line to a popup when a next-stop fix is available. */
function withNextStopDistance(popupHtml: string, distanceMeters: number | null): string {
  if (distanceMeters === null) return popupHtml;
  return (
    popupHtml +
    `<p class="map-info-distance"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> A ${formatDistance(distanceMeters)} de tu posición</p>`
  );
}

@Component({
  selector: 'app-rutas-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="rutas-map-component-wrapper">
      @if (isDegradedMap()) {
        <div class="offline-map-banner" role="status" aria-live="polite">
          <i class="bi bi-cloud-slash" aria-hidden="true"></i>
          <span>Modo mapa offline · Las imágenes pueden no estar disponibles</span>
        </div>
      }
      <div
        #mapContainer
        class="rutas-map-canvas"
        role="region"
        aria-label="Mapa de rutas y paradas"
      ></div>
      <button
        type="button"
        class="btn-center-user"
        (click)="centerOnUser()"
        aria-label="Centrar mapa en mi ubicación GPS"
        [title]="locateButtonTitle()"
      >
        <i class="bi bi-crosshair" aria-hidden="true"></i>
      </button>
    </div>
  `,
  styles: [
    `
      .rutas-map-component-wrapper {
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
        background: #e2e8f0;
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
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        pointer-events: none;
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
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }
      .btn-center-user:hover {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
      }
      .btn-center-user:active {
        transform: scale(0.92);
      }
      .btn-center-user:focus-visible {
        outline: 3px solid var(--primary-color, #0c9ea1);
        outline-offset: 2px;
      }

      /* Estilos autónomos de Leaflet Markers y Popups */
      :host ::ng-deep .map-user-marker {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #2563eb;
        border: 3px solid #fff;
        box-shadow:
          0 0 0 3px rgba(37, 99, 235, 0.35),
          0 2px 8px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: user-marker-pulse 2s infinite;
      }
      .map-user-marker i {
        color: #fff;
        font-size: 16px;
        line-height: 1;
      }
      @keyframes user-marker-pulse {
        0%,
        100% {
          box-shadow:
            0 0 0 3px rgba(37, 99, 235, 0.35),
            0 2px 8px rgba(0, 0, 0, 0.3);
        }
        50% {
          box-shadow:
            0 0 0 8px rgba(37, 99, 235, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.3);
        }
      }
      :host ::ng-deep .map-type-marker {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        outline: none;
        transition: transform 0.15s ease;
      }
      :host ::ng-deep .leaflet-marker-icon:focus,
      :host ::ng-deep .leaflet-marker-icon:focus-visible {
        outline: 3px solid #0c9ea1;
        outline-offset: 2px;
        transform: scale(1.18);
      }
      :host ::ng-deep .map-type-marker i {
        color: #fff;
        font-size: 14px;
        line-height: 1;
      }
      :host ::ng-deep .leaflet-popup-content-wrapper {
        border-radius: 8px !important;
        padding: 0 !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
      }
      :host ::ng-deep .leaflet-popup-content {
        margin: 12px !important;
        font-family: inherit !important;
      }
      :host ::ng-deep .map-info {
        font-family: inherit;
        font-size: 0.8125rem;
        color: var(--dark-text, #1e293b);
        line-height: 1.4;
        min-width: 160px;
      }
      :host ::ng-deep .map-info strong {
        display: block;
        font-size: 0.875rem;
        color: var(--dark-text, #1e293b);
      }
      :host ::ng-deep .map-info-distance {
        margin: 6px 0 0;
        font-size: 11px;
        font-weight: 600;
        color: var(--primary-color, #0c9ea1);
        display: flex;
        align-items: center;
        gap: 4px;
      }
    `,
  ],
})
export class RutasMapComponent implements OnInit, OnDestroy {
  readonly networkService = inject(NetworkService);
  private readonly ngZone = inject(NgZone);

  readonly points = input<MapPoint[]>([]);
  readonly pointSelected = output<string>();
  /** Distance (m) from the operator to the next stop of the selected route; null when unknown. */
  readonly nextStopDistance = input<number | null>(null);
  /** Identity (`<routeId>:<ordenTrabajoId>`) of the next-stop marker among `points`. */
  readonly nextStopPointKey = input<string | null>(null);
  /** Emits every GPS fix so the parent can throttle the signal and keep the marker live. */
  readonly userPositionChange = output<LatLng>();

  readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  private map?: L.Map;
  private tileLayer?: L.TileLayer;
  private markersGroup?: L.LayerGroup;
  private userMarker?: L.Marker;
  private userMarkerIcon?: L.DivIcon;
  private nextStopMarker?: L.Marker;
  private nextStopBasePopupHtml = '';
  private lastBoundsKey = '';
  private geoWatchId?: number;
  private initTimeoutId?: ReturnType<typeof setTimeout>;
  private isDestroyed = false;
  private consecutiveTileErrors = 0;

  readonly tileLayerUnavailable = signal<boolean>(false);
  readonly isDegradedMap = computed(
    () => !this.networkService.isOnline() || this.tileLayerUnavailable(),
  );

  constructor() {
    effect(() => {
      this.points();
      if (this.map && !this.isDestroyed) {
        untracked(() => this.renderPoints());
      }
    });

    effect(() => {
      const online = this.networkService.isOnline();
      if (!this.map || this.isDestroyed) return;

      if (online) {
        // A network recovery is not proof that Leaflet loaded a tile. Keep
        // degradation visible until a tileload event confirms recovery.
        this.ensureTileLayer();
      } else {
        this.removeTileLayer();
      }
    });

    effect(() => {
      this.isDegradedMap();
      if (this.map && !this.isDestroyed) {
        untracked(() => this.renderPoints());
      }
    });

    effect(() => {
      const distance = this.nextStopDistance();
      if (this.map && !this.isDestroyed && this.nextStopMarker?.isPopupOpen()) {
        // Live-update only the open popup — no marker rebuild, no refit at ~1 Hz.
        untracked(() => {
          this.nextStopMarker?.setPopupContent(
            withNextStopDistance(this.nextStopBasePopupHtml, distance),
          );
        });
      }
    });
  }

  ngOnInit(): void {
    this.initTimeoutId = setTimeout(() => {
      if (!this.isDestroyed) {
        this.initMap();
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = undefined;
    }
    this.destroyMap();
  }

  private initMap(): void {
    if (this.isDestroyed) return;
    this.destroyMap();
    this.tileLayerUnavailable.set(false);
    this.consecutiveTileErrors = 0;

    const containerRef = this.mapContainer();
    if (!containerRef?.nativeElement) return;
    const container = containerRef.nativeElement;

    const pts = this.points();
    const center: L.LatLngExpression = pts[0] ? [pts[0].lat, pts[0].lng] : [-0.9677, -80.7089];

    this.map = L.map(container).setView(center, 14);

    if (this.networkService.isOnline()) {
      this.ensureTileLayer();
    }

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.userMarkerIcon = L.divIcon({
      html: `<div class="map-user-marker" role="img" aria-label="Mi ubicación actual"><i class="bi bi-person-fill" aria-hidden="true"></i></div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    this.lastBoundsKey = '';
    this.renderPoints();
    this.startGeoWatch();
  }

  private ensureTileLayer(): void {
    if (!this.map || this.tileLayer) return;

    this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });

    this.tileLayer.on('tileerror', () => {
      this.consecutiveTileErrors += 1;
      if (this.consecutiveTileErrors >= 5) {
        this.tileLayerUnavailable.set(true);
      }
    });

    this.tileLayer.on('tileload', () => {
      this.consecutiveTileErrors = 0;
      if (this.networkService.isOnline()) {
        this.tileLayerUnavailable.set(false);
      }
    });

    this.tileLayer.addTo(this.map);
  }

  private removeTileLayer(): void {
    if (this.tileLayer && this.map) {
      this.map.removeLayer(this.tileLayer);
      this.tileLayer = undefined;
    }
  }

  private renderPoints(): void {
    if (!this.markersGroup || !this.map || this.isDestroyed) return;
    this.markersGroup.clearLayers();
    this.nextStopMarker = undefined;
    this.nextStopBasePopupHtml = '';

    const pts = this.points();
    const nextStopKey = this.nextStopPointKey();
    const routeLines = new Map<string, L.LatLngTuple[]>();
    for (const point of pts) {
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

    pts.forEach((point) => {
      const color = MARKER_COLORS[point.estado] ?? '#9ca3af';
      const iconClass = point.icon ?? 'bi-geo-alt-fill';
      const icon = L.divIcon({
        html: `<div class="map-type-marker" style="background:${color}"><i class="bi ${iconClass}" aria-hidden="true"></i></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
      });

      const isNextStop = nextStopKey !== null && point.pointKey === nextStopKey;
      const popupHtml = isNextStop
        ? withNextStopDistance(point.popupHtml, this.nextStopDistance())
        : point.popupHtml;
      const marker = L.marker([point.lat, point.lng], { icon, keyboard: true })
        .bindPopup(popupHtml)
        .addTo(this.markersGroup!);

      if (isNextStop) {
        this.nextStopMarker = marker;
        this.nextStopBasePopupHtml = point.popupHtml;
      }

      const markerElement = marker.getElement();
      markerElement?.setAttribute('role', 'button');
      markerElement?.setAttribute('aria-label', `Ruta ${point.routeId}`);

      marker.on('click', () => {
        this.pointSelected.emit(point.routeId);
      });

      marker.on('keypress', (e: L.LeafletKeyboardEvent) => {
        if (e.originalEvent.key === 'Enter' || e.originalEvent.key === ' ') {
          e.originalEvent.preventDefault();
          this.pointSelected.emit(point.routeId);
          marker.openPopup();
        }
      });
    });

    if (pts.length > 1) {
      // Guard: the rendered markers are rebuilt only when the coordinates change, so a
      // ~1 Hz next-stop distance refresh never refits the viewport while the user pans.
      const boundsKey = pts.map((p) => `${p.lat}:${p.lng}`).join('|');
      if (boundsKey !== this.lastBoundsKey) {
        this.lastBoundsKey = boundsKey;
        const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng] as L.LatLngTuple));
        this.map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }

  private startGeoWatch(): void {
    if (this.isDestroyed || typeof navigator === 'undefined' || !navigator.geolocation) return;
    this.geoWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!this.isDestroyed) {
          // Geolocation callbacks run outside the Angular zone: re-enter it so the
          // parent signal (userPosition) schedules change detection when it updates.
          this.ngZone.run(() => {
            this.updateUserMarker(pos.coords.latitude, pos.coords.longitude);
            this.userPositionChange.emit({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          });
        }
      },
      () => {
        /* Permiso denegado o error GPS */
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }

  private updateUserMarker(lat: number, lng: number): void {
    if (!this.map || this.isDestroyed) return;
    // divIcon is created once per map init (initMap) and reused across fixes —
    // the marker moves, the icon does not get recreated on every GPS fix.
    if (!this.userMarkerIcon) {
      this.userMarkerIcon = L.divIcon({
        html: `<div class="map-user-marker" role="img" aria-label="Mi ubicación actual"><i class="bi bi-person-fill" aria-hidden="true"></i></div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
    }
    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lng]);
    } else {
      this.userMarker = L.marker([lat, lng], { icon: this.userMarkerIcon }).addTo(this.map);
    }
  }

  /** Tooltip del botón de centrar: muestra la distancia a la próxima parada seleccionada. */
  locateButtonTitle(): string {
    const distance = this.nextStopDistance();
    return distance === null
      ? 'Mi ubicación'
      : `Próxima parada a ${formatDistance(distance)} de tu posición`;
  }

  centerOnUser(): void {
    if (this.userMarker && this.map && !this.isDestroyed) {
      this.map.setView(this.userMarker.getLatLng(), 16);
    }
  }

  private destroyMap(): void {
    if (
      this.geoWatchId !== undefined &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = undefined;
    }
    this.userMarker = undefined;
    this.userMarkerIcon = undefined;
    this.nextStopMarker = undefined;
    this.lastBoundsKey = '';
    this.tileLayer = undefined;
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.markersGroup = undefined;
    }
  }
}
