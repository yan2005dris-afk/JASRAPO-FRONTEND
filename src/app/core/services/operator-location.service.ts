import { Injectable } from '@angular/core';

export interface OperatorCoordinates {
  latitud: number;
  longitud: number;
}

@Injectable({
  providedIn: 'root',
})
export class OperatorLocationService {
  getCurrentCoordinates(): Promise<OperatorCoordinates | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
          }),
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 60_000,
        },
      );
    });
  }
}
