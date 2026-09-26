import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { NetworkService } from '../../../core/services/network.service';

export interface ICoordinates {
  latitud: number | null;
  longitud: number | null;
}

export const OLON_CENTER: L.LatLngTuple = [-1.7966, -80.7568];

const COORDINATE_DECIMALS = 8;
const ZOOM_WITH_PIN = 17;
const ZOOM_WITHOUT_PIN = 15;
const MAX_TILE_ERRORS = 5;

function isValidPair(latitud: number | null, longitud: number | null): boolean {
  return (
    latitud !== null &&
    longitud !== null &&
    Number.isFinite(latitud) &&
    Number.isFinite(longitud) &&
    latitud >= -90 &&
    latitud <= 90 &&
    longitud >= -180 &&
    longitud <= 180
  );
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(COORDINATE_DECIMALS));
}

@Component({
  selector: 'app-coordinate-map-picker',
  imports: [],
  templateUrl: './coordinate-map-picker.component.html',
  styleUrl: './coordinate-map-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinateMapPickerComponent implements OnInit, OnDestroy {
  private readonly networkService = inject(NetworkService);

  readonly latitud = input<number | null>(null);
  readonly longitud = input<number | null>(null);
  readonly errorMessage = input<string | null>(null);
  readonly inputIdPrefix = input('coordenadas');

  readonly coordinatesChange = output<ICoordinates>();

  readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  private map?: L.Map;
  private tileLayer?: L.TileLayer;
  private marker?: L.Marker;
  private initTimeoutId?: ReturnType<typeof setTimeout>;
  private isDestroyed = false;
  private consecutiveTileErrors = 0;

  readonly tileLayerUnavailable = signal(false);
  readonly isDegradedMap = computed(
    () => !this.networkService.isOnline() || this.tileLayerUnavailable(),
  );

  readonly isLocating = signal(false);
  readonly geolocationError = signal<string | null>(null);
  readonly canGeolocate = typeof navigator !== 'undefined' && !!navigator.geolocation;

  constructor() {
    effect(() => {
      const lat = this.latitud();
      const lng = this.longitud();
      if (this.map && !this.isDestroyed) {
        untracked(() => this.syncMarker(lat, lng));
      }
    });

    effect(() => {
      const online = this.networkService.isOnline();
      if (!this.map || this.isDestroyed) return;

      if (online) {
        this.ensureTileLayer();
      } else {
        this.removeTileLayer();
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

    const lat = this.latitud();
    const lng = this.longitud();
    const hasPin = isValidPair(lat, lng);
    const center: L.LatLngExpression = hasPin ? [lat as number, lng as number] : OLON_CENTER;

    this.map = L.map(container).setView(center, hasPin ? ZOOM_WITH_PIN : ZOOM_WITHOUT_PIN);
    this.map.invalidateSize();

    if (this.networkService.isOnline()) {
      this.ensureTileLayer();
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.selectPoint(e.latlng.lat, e.latlng.lng);
    });

    this.syncMarker(lat, lng);
  }

  private ensureTileLayer(): void {
    if (!this.map || this.tileLayer) return;

    this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });

    this.tileLayer.on('tileerror', () => {
      this.consecutiveTileErrors += 1;
      if (this.consecutiveTileErrors >= MAX_TILE_ERRORS) {
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

  private syncMarker(lat: number | null, lng: number | null): void {
    if (!this.map || this.isDestroyed) return;

    if (!isValidPair(lat, lng)) {
      if (this.marker) {
        this.map.removeLayer(this.marker);
        this.marker = undefined;
      }
      return;
    }

    const position: L.LatLngTuple = [lat as number, lng as number];

    if (this.marker) {
      this.marker.setLatLng(position);
    } else {
      const icon = L.divIcon({
        html: '<div class="coordinate-pin"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i></div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      this.marker = L.marker(position, { icon, draggable: true, keyboard: true });
      this.marker.on('dragend', () => {
        const latlng = this.marker?.getLatLng();
        if (latlng) {
          this.selectPoint(latlng.lat, latlng.lng);
        }
      });
      const markerElement = this.marker.addTo(this.map).getElement();
      markerElement?.setAttribute('aria-label', 'Ubicación del predio');
    }

    if (!this.map.getBounds().contains(position)) {
      this.map.panTo(position);
    }
  }

  selectPoint(lat: number, lng: number): void {
    this.coordinatesChange.emit({
      latitud: roundCoordinate(lat),
      longitud: roundCoordinate(lng),
    });
  }

  onLatitudChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.coordinatesChange.emit({
      latitud: value === '' ? null : Number(value),
      longitud: this.longitud(),
    });
  }

  onLongitudChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.coordinatesChange.emit({
      latitud: this.latitud(),
      longitud: value === '' ? null : Number(value),
    });
  }

  useCurrentLocation(): void {
    if (!this.canGeolocate || this.isLocating()) return;

    this.isLocating.set(true);
    this.geolocationError.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating.set(false);
        this.selectPoint(position.coords.latitude, position.coords.longitude);
      },
      () => {
        this.isLocating.set(false);
        this.geolocationError.set('No se pudo obtener su ubicación.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  private destroyMap(): void {
    this.marker = undefined;
    this.tileLayer = undefined;
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }
}
