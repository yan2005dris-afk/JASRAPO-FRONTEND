import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';

import {
  CoordinateMapPickerComponent,
  ICoordinates,
  IPolygonGeometry,
  OUT_OF_SERVICE_AREA_MESSAGE,
} from './coordinate-map-picker.component';
import { NetworkService } from '../../../core/services/network.service';

describe('CoordinateMapPickerComponent', () => {
  const isOnlineSignal = signal(true);

  beforeEach(() => {
    isOnlineSignal.set(true);

    TestBed.configureTestingModule({
      imports: [CoordinateMapPickerComponent],
      providers: [
        {
          provide: NetworkService,
          useValue: {
            isOnline: isOnlineSignal,
          },
        },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates successfully and renders the map with no marker when coordinates are unset', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const container = fixture.nativeElement.querySelector('.coordinate-picker-canvas');
    expect(container.classList.contains('leaflet-container')).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(0);
  });

  it('renders a marker when a valid coordinate pair is provided', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.componentRef.setInput('latitud', -1.8021);
    fixture.componentRef.setInput('longitud', -80.7554);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(1);
  });

  it('removes the pin when the consumer clears the bound coordinates to null', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.componentRef.setInput('latitud', -1.8021);
    fixture.componentRef.setInput('longitud', -80.7554);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));
    expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(1);

    fixture.componentRef.setInput('latitud', null);
    fixture.componentRef.setInput('longitud', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(0);
  });

  it('emits rounded coordinates when the map is clicked (selectPoint)', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const emitted: ICoordinates[] = [];
    fixture.componentInstance.coordinatesChange.subscribe((value) => emitted.push(value));

    fixture.componentInstance.selectPoint(-1.80211234567, -80.75541234567);

    expect(emitted).toEqual([{ latitud: -1.80211235, longitud: -80.75541235 }]);
  });

  it('emits updated coordinates when the marker is dragged', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.componentRef.setInput('latitud', -1.8021);
    fixture.componentRef.setInput('longitud', -80.7554);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const emitted: ICoordinates[] = [];
    fixture.componentInstance.coordinatesChange.subscribe((value) => emitted.push(value));

    const marker = (fixture.componentInstance as unknown as { marker: L.Marker }).marker;
    marker.setLatLng([-1.79, -80.75]);
    marker.fire('dragend');

    expect(emitted).toEqual([{ latitud: -1.79, longitud: -80.75 }]);
  });

  it('emits parsed numeric values or null when the manual inputs change', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const emitted: ICoordinates[] = [];
    fixture.componentInstance.coordinatesChange.subscribe((value) => emitted.push(value));

    const latInput = fixture.nativeElement.querySelector(
      '#coordenadas-latitud',
    ) as HTMLInputElement;
    latInput.value = '-1.5';
    latInput.dispatchEvent(new Event('change'));

    expect(emitted[0]).toEqual({ latitud: -1.5, longitud: null });

    latInput.value = '';
    latInput.dispatchEvent(new Event('change'));

    expect(emitted[1]).toEqual({ latitud: null, longitud: null });
  });

  it('shows the geolocate button only when geolocation is available and emits on success', async () => {
    const getCurrentPositionSpy = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: -1.79,
          longitude: -80.75,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: getCurrentPositionSpy },
    });

    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const emitted: ICoordinates[] = [];
    fixture.componentInstance.coordinatesChange.subscribe((value) => emitted.push(value));

    const button = fixture.nativeElement.querySelector('button.btn-outline-primary');
    expect(button).toBeTruthy();

    button.click();

    expect(getCurrentPositionSpy).toHaveBeenCalled();
    expect(emitted).toEqual([{ latitud: -1.79, longitud: -80.75 }]);
  });

  it('hides the geolocate button when geolocation is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, geolocation: undefined });

    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    expect(fixture.nativeElement.querySelector('button.btn-outline-primary')).toBeNull();
  });

  it('commits the typed value on Enter without submitting the parent form', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const emitted: ICoordinates[] = [];
    fixture.componentInstance.coordinatesChange.subscribe((value) => emitted.push(value));

    const lngInput = fixture.nativeElement.querySelector(
      '#coordenadas-longitud',
    ) as HTMLInputElement;
    lngInput.value = '-80.75';
    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    lngInput.dispatchEvent(enter);

    expect(enter.defaultPrevented).toBe(true);
    expect(emitted).toEqual([{ latitud: null, longitud: -80.75 }]);
  });

  it.each([
    [1, 'Permiso de ubicación denegado en el navegador.'],
    [
      2,
      'Ubicación no disponible. Verifique que los servicios de ubicación del sistema estén activados.',
    ],
    [3, 'Se agotó el tiempo para obtener la ubicación. Intente nuevamente.'],
    [99, 'No se pudo obtener su ubicación.'],
  ])('shows a specific message for geolocation error code %i', async (code, message) => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
          error({ code, message: 'error' } as GeolocationPositionError),
      },
    });

    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    fixture.componentInstance.useCurrentLocation();

    expect(fixture.componentInstance.geolocationError()).toBe(message);
  });

  it('surfaces a non-blocking error and does not change coordinates when geolocation fails', async () => {
    const getCurrentPositionSpy = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: 'denied' } as GeolocationPositionError);
      },
    );

    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: getCurrentPositionSpy },
    });

    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const emitted: ICoordinates[] = [];
    fixture.componentInstance.coordinatesChange.subscribe((value) => emitted.push(value));

    fixture.componentInstance.useCurrentLocation();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(fixture.componentInstance.geolocationError()).toBe(
      'Permiso de ubicación denegado en el navegador.',
    );
  });

  it('shows a degraded banner when offline and keeps the manual inputs usable', async () => {
    isOnlineSignal.set(false);

    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    expect(fixture.componentInstance.isDegradedMap()).toBe(true);
    expect(fixture.nativeElement.querySelector('.offline-map-banner')).toBeTruthy();

    const latInput = fixture.nativeElement.querySelector(
      '#coordenadas-latitud',
    ) as HTMLInputElement;
    expect(latInput.disabled).toBe(false);
  });

  it('marks the tile layer unavailable after repeated tile errors, and recovers on a successful load', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const tileLayer = (fixture.componentInstance as unknown as { tileLayer: L.TileLayer })
      .tileLayer;
    for (let i = 0; i < 5; i++) tileLayer.fire('tileerror');
    expect(fixture.componentInstance.tileLayerUnavailable()).toBe(true);

    tileLayer.fire('tileload');
    expect(fixture.componentInstance.tileLayerUnavailable()).toBe(false);
  });

  it('renders the error message when provided', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.componentRef.setInput(
      'errorMessage',
      'Ingrese latitud y longitud, o deje ambas vacías.',
    );
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    expect(fixture.nativeElement.textContent).toContain(
      'Ingrese latitud y longitud, o deje ambas vacías.',
    );
  });

  it('removes marker layers from the DOM after the component is destroyed', async () => {
    const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
    fixture.componentRef.setInput('latitud', -1.8021);
    fixture.componentRef.setInput('longitud', -80.7554);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(1);

    fixture.destroy();

    expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(0);
  });

  describe('with a service area', () => {
    const serviceArea: IPolygonGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [-80.78, -1.83],
          [-80.73, -1.83],
          [-80.73, -1.77],
          [-80.78, -1.77],
          [-80.78, -1.83],
        ],
      ],
    };
    const INSIDE = { lat: -1.8, lng: -80.75 };
    const OUTSIDE = { lat: -2.2, lng: -80.9 };

    async function createPicker(latitud: number | null = null, longitud: number | null = null) {
      const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
      fixture.componentRef.setInput('serviceArea', serviceArea);
      fixture.componentRef.setInput('latitud', latitud);
      fixture.componentRef.setInput('longitud', longitud);
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 10));

      const emitted: ICoordinates[] = [];
      fixture.componentInstance.coordinatesChange.subscribe((value) => emitted.push(value));
      return { fixture, emitted };
    }

    function privateState(fixture: { componentInstance: CoordinateMapPickerComponent }) {
      return fixture.componentInstance as unknown as {
        map: L.Map;
        marker: L.Marker;
        serviceAreaLayer?: L.GeoJSON;
      };
    }

    it('draws the service area polygon on the map', async () => {
      const { fixture } = await createPicker();

      const layer = privateState(fixture).serviceAreaLayer;
      expect(layer).toBeDefined();
      expect(privateState(fixture).map.hasLayer(layer as L.GeoJSON)).toBe(true);
      expect(layer?.getBounds().contains([INSIDE.lat, INSIDE.lng])).toBe(true);
    });

    it('fits the map to the service area when there is no pin, but not when a pin exists', async () => {
      const fitBoundsSpy = vi.spyOn(L.Map.prototype, 'fitBounds');

      await createPicker();
      expect(fitBoundsSpy).toHaveBeenCalledTimes(1);

      fitBoundsSpy.mockClear();
      await createPicker(INSIDE.lat, INSIDE.lng);
      expect(fitBoundsSpy).not.toHaveBeenCalled();

      fitBoundsSpy.mockRestore();
    });

    it('draws the polygon when the service area arrives after the map is initialized', async () => {
      const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 10));
      expect(privateState(fixture).serviceAreaLayer).toBeUndefined();

      fixture.componentRef.setInput('serviceArea', serviceArea);
      fixture.detectChanges();

      expect(privateState(fixture).serviceAreaLayer).toBeDefined();
    });

    it('emits when the map is clicked inside the service area', async () => {
      const { fixture, emitted } = await createPicker();

      privateState(fixture).map.fire('click', { latlng: L.latLng(INSIDE.lat, INSIDE.lng) });

      expect(emitted).toEqual([{ latitud: INSIDE.lat, longitud: INSIDE.lng }]);
      expect(fixture.componentInstance.serviceAreaError()).toBeNull();
    });

    it('does not emit and shows a message when the map is clicked outside the service area', async () => {
      const { fixture, emitted } = await createPicker();

      privateState(fixture).map.fire('click', { latlng: L.latLng(OUTSIDE.lat, OUTSIDE.lng) });
      fixture.detectChanges();

      expect(emitted).toEqual([]);
      expect(fixture.nativeElement.textContent).toContain(OUT_OF_SERVICE_AREA_MESSAGE);

      privateState(fixture).map.fire('click', { latlng: L.latLng(INSIDE.lat, INSIDE.lng) });
      fixture.detectChanges();

      expect(emitted).toEqual([{ latitud: INSIDE.lat, longitud: INSIDE.lng }]);
      expect(fixture.nativeElement.textContent).not.toContain(OUT_OF_SERVICE_AREA_MESSAGE);
    });

    it('snaps the marker back to the last valid position when dragged outside', async () => {
      const { fixture, emitted } = await createPicker(INSIDE.lat, INSIDE.lng);

      const marker = privateState(fixture).marker;
      marker.setLatLng([OUTSIDE.lat, OUTSIDE.lng]);
      marker.fire('dragend');

      expect(emitted).toEqual([]);
      expect(marker.getLatLng().lat).toBe(INSIDE.lat);
      expect(marker.getLatLng().lng).toBe(INSIDE.lng);
      expect(fixture.componentInstance.serviceAreaError()).toBe(OUT_OF_SERVICE_AREA_MESSAGE);
    });

    it('does not emit a complete manual pair outside the service area and keeps the typed values', async () => {
      const { fixture, emitted } = await createPicker();
      const latInput = fixture.nativeElement.querySelector(
        '#coordenadas-latitud',
      ) as HTMLInputElement;
      const lngInput = fixture.nativeElement.querySelector(
        '#coordenadas-longitud',
      ) as HTMLInputElement;

      latInput.value = String(OUTSIDE.lat);
      latInput.dispatchEvent(new Event('change'));
      expect(emitted).toEqual([{ latitud: OUTSIDE.lat, longitud: null }]);

      lngInput.value = String(OUTSIDE.lng);
      lngInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(emitted).toHaveLength(1);
      expect(lngInput.value).toBe(String(OUTSIDE.lng));
      expect(fixture.nativeElement.textContent).toContain(OUT_OF_SERVICE_AREA_MESSAGE);

      latInput.value = String(INSIDE.lat);
      lngInput.value = String(INSIDE.lng);
      lngInput.dispatchEvent(new Event('change'));

      expect(emitted[1]).toEqual({ latitud: INSIDE.lat, longitud: INSIDE.lng });
      expect(fixture.componentInstance.serviceAreaError()).toBeNull();
    });

    it('does not emit and shows a message when the geolocated position is outside', async () => {
      vi.stubGlobal('navigator', {
        ...navigator,
        geolocation: {
          getCurrentPosition: (success: PositionCallback) =>
            success({
              coords: { latitude: OUTSIDE.lat, longitude: OUTSIDE.lng },
              timestamp: Date.now(),
            } as GeolocationPosition),
        },
      });
      const { fixture, emitted } = await createPicker();

      fixture.componentInstance.useCurrentLocation();

      expect(emitted).toEqual([]);
      expect(fixture.componentInstance.serviceAreaError()).toBe(OUT_OF_SERVICE_AREA_MESSAGE);
    });

    it('renders an existing pin outside the service area and warns without emitting', async () => {
      const { fixture, emitted } = await createPicker(OUTSIDE.lat, OUTSIDE.lng);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(1);
      expect(fixture.nativeElement.textContent).toContain(OUT_OF_SERVICE_AREA_MESSAGE);
      expect(emitted).toEqual([]);
    });

    describe('focus point', () => {
      const FOCUS = { latitud: -1.7747, longitud: -80.7643 };
      const OTHER_FOCUS = { latitud: -1.7982, longitud: -80.7582 };

      async function createFocusedPicker(
        focusPoint: ICoordinates | null,
        latitud: number | null = null,
        longitud: number | null = null,
      ) {
        const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
        fixture.componentRef.setInput('serviceArea', serviceArea);
        fixture.componentRef.setInput('focusPoint', focusPoint);
        fixture.componentRef.setInput('latitud', latitud);
        fixture.componentRef.setInput('longitud', longitud);
        fixture.detectChanges();
        await new Promise((r) => setTimeout(r, 10));

        const emitted: ICoordinates[] = [];
        fixture.componentInstance.coordinatesChange.subscribe((value) => emitted.push(value));
        return { fixture, emitted };
      }

      function expectCenter(map: L.Map, point: { latitud: number; longitud: number }) {
        expect(map.getCenter().lat).toBeCloseTo(point.latitud, 4);
        expect(map.getCenter().lng).toBeCloseTo(point.longitud, 4);
      }

      it('centers on the focus point at load instead of fitting the service area when there is no pin', async () => {
        const fitBoundsSpy = vi.spyOn(L.Map.prototype, 'fitBounds');

        const { fixture } = await createFocusedPicker(FOCUS);

        expect(fitBoundsSpy).not.toHaveBeenCalled();
        expectCenter(privateState(fixture).map, FOCUS);
        fitBoundsSpy.mockRestore();
      });

      it('keeps centering on the existing pin at load even when a focus point is provided', async () => {
        const { fixture } = await createFocusedPicker(FOCUS, INSIDE.lat, INSIDE.lng);

        expectCenter(privateState(fixture).map, { latitud: INSIDE.lat, longitud: INSIDE.lng });
      });

      it('recenters on a new focus point without moving the marker or emitting coordinates', async () => {
        const { fixture, emitted } = await createFocusedPicker(null, INSIDE.lat, INSIDE.lng);
        const flyToSpy = vi.spyOn(privateState(fixture).map, 'flyTo');

        fixture.componentRef.setInput('focusPoint', FOCUS);
        fixture.detectChanges();

        expect(flyToSpy).toHaveBeenCalledWith([FOCUS.latitud, FOCUS.longitud], 15);
        expectCenter(privateState(fixture).map, FOCUS);
        expect(privateState(fixture).marker.getLatLng()).toEqual(L.latLng(INSIDE.lat, INSIDE.lng));
        expect(emitted).toEqual([]);

        fixture.componentRef.setInput('focusPoint', OTHER_FOCUS);
        fixture.detectChanges();

        expectCenter(privateState(fixture).map, OTHER_FOCUS);
        expect(emitted).toEqual([]);
      });

      it('fits the map to the service area when the focus point changes to null', async () => {
        const { fixture, emitted } = await createFocusedPicker(FOCUS);
        const map = privateState(fixture).map;
        const fitBoundsSpy = vi.spyOn(map, 'fitBounds');

        fixture.componentRef.setInput('focusPoint', null);
        fixture.detectChanges();

        expect(fitBoundsSpy).toHaveBeenCalledWith(
          privateState(fixture).serviceAreaLayer?.getBounds(),
        );
        expect(emitted).toEqual([]);
      });
    });

    it('keeps the unrestricted behavior when the service area is null', async () => {
      const fixture = TestBed.createComponent(CoordinateMapPickerComponent);
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 10));
      const emitted: ICoordinates[] = [];
      fixture.componentInstance.coordinatesChange.subscribe((value) => emitted.push(value));

      privateState(fixture).map.fire('click', { latlng: L.latLng(OUTSIDE.lat, OUTSIDE.lng) });

      expect(emitted).toEqual([{ latitud: OUTSIDE.lat, longitud: OUTSIDE.lng }]);
      expect(fixture.componentInstance.serviceAreaError()).toBeNull();
      expect(privateState(fixture).serviceAreaLayer).toBeUndefined();
    });
  });
});
