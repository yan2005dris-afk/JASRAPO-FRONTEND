import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';

import { CoordinateMapPickerComponent, ICoordinates } from './coordinate-map-picker.component';
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
    expect(fixture.componentInstance.geolocationError()).toBe('No se pudo obtener su ubicación.');
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
});
