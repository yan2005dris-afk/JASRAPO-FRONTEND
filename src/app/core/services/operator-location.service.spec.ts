import { TestBed } from '@angular/core/testing';
import { OperatorLocationService } from './operator-location.service';

describe('OperatorLocationService', () => {
  let service: OperatorLocationService;
  let originalGeolocation: Geolocation | undefined;

  beforeEach(() => {
    originalGeolocation = navigator.geolocation;
    TestBed.configureTestingModule({ providers: [OperatorLocationService] });
    service = TestBed.inject(OperatorLocationService);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
  });

  it('returns the current coordinates with high-accuracy options', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: -0.9677, longitude: -80.7089 },
      } as GeolocationPosition);
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    await expect(service.getCurrentCoordinates()).resolves.toEqual({
      latitud: -0.9677,
      longitud: -80.7089,
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  });

  it('returns null when location permission or acquisition fails', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
          error({ code: 1, message: 'Permission denied' } as GeolocationPositionError),
      },
    });

    await expect(service.getCurrentCoordinates()).resolves.toBeNull();
  });
});
