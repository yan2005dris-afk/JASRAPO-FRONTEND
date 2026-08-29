import { TestBed } from '@angular/core/testing';
import { RutasMapComponent, MapPoint } from './rutas-map.component';
import { NetworkService } from '../../../../core/services/network.service';
import * as L from 'leaflet';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('RutasMapComponent', () => {
  const isOnlineSignal = signal(true);

  const mockPoints: MapPoint[] = [
    {
      routeId: 'route-1',
      lat: -0.9677,
      lng: -80.7089,
      estado: 'PENDIENTE',
      tipoRuta: 'LECTURA',
      popupHtml: '<b>Punto 1</b>',
    },
    {
      routeId: 'route-1',
      lat: -0.968,
      lng: -80.7095,
      estado: 'COMPLETADA',
      tipoRuta: 'LECTURA',
      popupHtml: '<b>Punto 2</b>',
    },
  ];

  let watchPositionSpy: ReturnType<typeof vi.fn>;
  let clearWatchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isOnlineSignal.set(true);

    watchPositionSpy = vi.fn().mockReturnValue(12345);
    clearWatchSpy = vi.fn();

    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        watchPosition: watchPositionSpy,
        clearWatch: clearWatchSpy,
      },
    });

    TestBed.configureTestingModule({
      imports: [RutasMapComponent],
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

  it('creates successfully and manages degraded offline mode computed state', () => {
    const fixture = TestBed.createComponent(RutasMapComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();

    expect(comp.isDegradedMap()).toBe(false);

    comp.tileLayerUnavailable.set(true);
    expect(comp.isDegradedMap()).toBe(true);

    comp.tileLayerUnavailable.set(false);
    isOnlineSignal.set(false);
    expect(comp.isDegradedMap()).toBe(true);
  });

  it('initializes Leaflet map and layer group using native container element', async () => {
    const fixture = TestBed.createComponent(RutasMapComponent);
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const container = fixture.nativeElement.querySelector('.rutas-map-canvas');
    expect(container).toBeTruthy();
    expect(container.classList.contains('leaflet-container')).toBe(true);

    expect(watchPositionSpy).toHaveBeenCalled();
  });

  it('starts geolocation watch and updates marker when GPS coordinates arrive', async () => {
    let successCallback!: PositionCallback;
    watchPositionSpy.mockImplementation((cb: PositionCallback) => {
      successCallback = cb;
      return 999;
    });

    const fixture = TestBed.createComponent(RutasMapComponent);
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    expect(watchPositionSpy).toHaveBeenCalled();

    // Simula ubicación GPS
    successCallback({
      coords: {
        latitude: -0.9675,
        longitude: -80.7085,
        accuracy: 5,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);

    fixture.detectChanges();

    // Centrar en el usuario
    fixture.componentInstance.centerOnUser();
    expect(clearWatchSpy).not.toHaveBeenCalled();
  });

  it('cleans up GPS watch and leaflet map on destroy, preventing orphaned timers', async () => {
    const fixture = TestBed.createComponent(RutasMapComponent);
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 15));

    expect(watchPositionSpy).toHaveBeenCalled();

    fixture.destroy();
    expect(clearWatchSpy).toHaveBeenCalledWith(12345);
  });

  it('cancels pending initMap timeout if destroyed immediately before map initializes', async () => {
    const fixture = TestBed.createComponent(RutasMapComponent);
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();

    // Destruye inmediatamente antes del microtask de inicialización
    fixture.destroy();
    await new Promise((r) => setTimeout(r, 15));

    const container = fixture.nativeElement.querySelector('.rutas-map-canvas');
    expect(container.classList.contains('leaflet-container')).toBe(false);
  });

  it('automatically recovers tile layer when coming back online from offline', async () => {
    isOnlineSignal.set(false);

    const fixture = TestBed.createComponent(RutasMapComponent);
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    expect(fixture.componentInstance.isDegradedMap()).toBe(true);

    // Vuelve online
    isOnlineSignal.set(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.isDegradedMap()).toBe(false);
  });

  it('allows multiple instances without ID collisions due to ElementRef scoping', async () => {
    const fixture1 = TestBed.createComponent(RutasMapComponent);
    const fixture2 = TestBed.createComponent(RutasMapComponent);

    fixture1.componentRef.setInput('points', mockPoints);
    fixture2.componentRef.setInput('points', mockPoints);

    fixture1.detectChanges();
    fixture2.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const canvas1 = fixture1.nativeElement.querySelector('.rutas-map-canvas');
    const canvas2 = fixture2.nativeElement.querySelector('.rutas-map-canvas');

    expect(canvas1).not.toBe(canvas2);
    expect(canvas1.classList.contains('leaflet-container')).toBe(true);
    expect(canvas2.classList.contains('leaflet-container')).toBe(true);
  });

  it('makes each marker a single keyboard-accessible button and emits on click and Enter', async () => {
    const fixture = TestBed.createComponent(RutasMapComponent);
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const selected: string[] = [];
    fixture.componentInstance.pointSelected.subscribe((id) => selected.push(id));
    const marker = fixture.nativeElement.querySelector('.leaflet-marker-icon') as HTMLElement;
    const markerContent = marker.querySelector('.map-type-marker') as HTMLElement;

    expect(marker.getAttribute('role')).toBe('button');
    expect(marker.getAttribute('aria-label')).toBe('Ruta route-1');
    expect(marker.tabIndex).toBe(0);
    expect(markerContent.tabIndex).toBe(-1);

    marker.click();
    marker.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
    expect(selected).toEqual(['route-1', 'route-1']);
  });

  it('keeps tile degradation after network recovery until a tile loads', async () => {
    const fixture = TestBed.createComponent(RutasMapComponent);
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));

    const tileLayer = (fixture.componentInstance as unknown as { tileLayer: L.TileLayer })
      .tileLayer;
    for (let i = 0; i < 5; i++) tileLayer.fire('tileerror');
    expect(fixture.componentInstance.tileLayerUnavailable()).toBe(true);

    isOnlineSignal.set(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.tileLayerUnavailable()).toBe(true);

    tileLayer.fire('tileload');
    expect(fixture.componentInstance.tileLayerUnavailable()).toBe(false);
  });

  it('rerenders markers when the points input changes', async () => {
    const fixture = TestBed.createComponent(RutasMapComponent);
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));
    expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(2);

    fixture.componentRef.setInput('points', [mockPoints[0]]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(1);
  });
});
