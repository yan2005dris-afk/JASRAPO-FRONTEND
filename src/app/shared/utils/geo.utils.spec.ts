import { describe, expect, it } from 'vitest';
import { formatDistance, haversineMeters, type LatLng } from './geo.utils';

describe('haversineMeters', () => {
  it('returns 0 for the same point', () => {
    const point: LatLng = { lat: -0.9677, lng: -80.7089 };
    expect(haversineMeters(point, { lat: -0.9677, lng: -80.7089 })).toBe(0);
  });

  it('returns roughly half the Earth circumference for antipodal points (wide tolerance)', () => {
    const antipodal = haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(antipodal).toBeGreaterThan(19_900_000);
    expect(antipodal).toBeLessThan(20_200_000);
  });

  it('matches the known Madrid-Barcelona distance (~505 km)', () => {
    const madrid: LatLng = { lat: 40.4168, lng: -3.7038 };
    const barcelona: LatLng = { lat: 41.3874, lng: 2.1686 };
    const distance = haversineMeters(madrid, barcelona);
    expect(Math.abs(distance - 505_000)).toBeLessThan(5_000);
  });

  it('resolves sub-100 m distances reliably enough for GPS proximity', () => {
    const a: LatLng = { lat: 0, lng: 0 };
    const b: LatLng = { lat: 0.0005, lng: 0 };
    const distance = haversineMeters(a, b);
    expect(distance).toBeLessThan(100);
    expect(Math.abs(distance - 55.6)).toBeLessThan(1);
  });

  it('is symmetric (A->B equals B->A)', () => {
    const a: LatLng = { lat: -0.9677, lng: -80.7089 };
    const b: LatLng = { lat: -1.045, lng: -80.5 };
    expect(haversineMeters(a, b)).toBe(haversineMeters(b, a));
  });
});

describe('formatDistance', () => {
  it('renders meters under 1 km with integer meters', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(842)).toBe('842 m');
    expect(formatDistance(999)).toBe('999 m');
  });

  it('renders kilometers from 1 km with one decimal', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(1234)).toBe('1.2 km');
    expect(formatDistance(12_345)).toBe('12.3 km');
  });
});
