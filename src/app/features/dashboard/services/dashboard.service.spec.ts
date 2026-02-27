import { TestBed } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return all clients when filter is Todos', () => {
    service.setFilter('Todos');
    const all = service.filteredClients();
    expect(all.length).toBeGreaterThan(0);
  });

  it('should filter by Morosos', () => {
    service.setFilter('Morosos');
    const morosos = service.filteredClients();
    expect(morosos.every(c => c.estado === 'Moroso')).toBe(true);
  });

  it('should filter by Sin Lectura', () => {
    service.setFilter('Sin Lectura');
    const sinLectura = service.filteredClients();
    expect(sinLectura.every(c => c.estado === 'Sin lectura')).toBe(true);
  });

  it('should filter by search query matching nombre', () => {
    service.setFilter('Todos');
    service.setSearchQuery('Ana');
    const results = service.filteredClients();
    expect(results.every(c => c.nombre.toLowerCase().includes('ana'))).toBe(true);
  });

  it('should filter by search query matching sector', () => {
    service.setFilter('Todos');
    service.setSearchQuery('Norte');
    const results = service.filteredClients();
    expect(results.every(c => c.sector.toLowerCase().includes('norte'))).toBe(true);
  });

  it('should return empty array when search query matches nothing', () => {
    service.setSearchQuery('zzznomatch');
    expect(service.filteredClients().length).toBe(0);
  });

  it('should return all clients when search query is empty', () => {
    service.setFilter('Todos');
    service.setSearchQuery('');
    expect(service.filteredClients().length).toBe(service.clients().length);
  });
});
