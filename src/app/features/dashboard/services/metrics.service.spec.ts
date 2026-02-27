import { TestBed } from '@angular/core/testing';
import { MetricsService } from './metrics.service';
import { Client } from '../models/dashboard.models';

const mockClients: Client[] = [
  { id: 1, nombre: 'Ana Torres', sector: 'Centro', consumo: 100, estado: 'Activo' },
  { id: 2, nombre: 'Juan Mena', sector: 'Norte', consumo: 0, estado: 'Sin lectura' },
  { id: 3, nombre: 'Sofía Ledesma', sector: 'Sur', consumo: 80, estado: 'Moroso' },
];

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetricsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('calculateStats: should count total clients', () => {
    const stats = service.calculateStats(mockClients);
    expect(stats.totalClients).toBe(3);
  });

  it('calculateStats: should count active clients', () => {
    const stats = service.calculateStats(mockClients);
    expect(stats.activeClients).toBe(1);
  });

  it('calculateStats: should count delinquent clients', () => {
    const stats = service.calculateStats(mockClients);
    expect(stats.delinquentClients).toBe(1);
  });

  it('calculateStats: should count pending readings', () => {
    const stats = service.calculateStats(mockClients);
    expect(stats.pendingReadings).toBe(1);
  });

  it('calculateStats: should sum total consumption', () => {
    const stats = service.calculateStats(mockClients);
    expect(stats.totalConsumption).toBe(180);
  });

  it('calculateStats: should compute average consumption', () => {
    const stats = service.calculateStats(mockClients);
    expect(stats.averageConsumption).toBe(60);
  });

  it('calculateStats: should return zero averageConsumption for empty array', () => {
    const stats = service.calculateStats([]);
    expect(stats.averageConsumption).toBe(0);
  });

  it('calculateStats: should handle clients with zero consumption', () => {
    const zeroClients: Client[] = [
      { id: 1, nombre: 'Test', sector: 'X', consumo: 0, estado: 'Activo' },
    ];
    const stats = service.calculateStats(zeroClients);
    expect(stats.totalConsumption).toBe(0);
    expect(stats.averageConsumption).toBe(0);
  });

  it('updateStats: should update the stats signal', () => {
    service.updateStats(mockClients);
    expect(service.stats().totalClients).toBe(3);
  });
});
