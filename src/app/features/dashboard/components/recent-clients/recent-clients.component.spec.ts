import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentClientsComponent } from './recent-clients.component';
import { Client, ClientFilter } from '../../models/dashboard.models';

const mockClients: Client[] = [
  { id: 1, nombre: 'Ana Torres', sector: 'Centro', consumo: 125, estado: 'Activo' },
];

const mockFilters: ClientFilter[] = [{ label: 'Todos', value: 'Todos' }];

describe('RecentClientsComponent', () => {
  let fixture: ComponentFixture<RecentClientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RecentClientsComponent] }).compileComponents();
    fixture = TestBed.createComponent(RecentClientsComponent);
    fixture.componentRef.setInput('clients', mockClients);
    fixture.componentRef.setInput('filters', mockFilters);
    fixture.componentRef.setInput('activeFilter', 'Todos');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render client rows', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });

  it('getStatusClass: should return badge-soft-success for Activo', () => {
    expect(fixture.componentInstance.getStatusClass('Activo')).toBe('badge-soft-success');
  });

  it('getStatusClass: should return badge-soft-warning for Sin lectura', () => {
    expect(fixture.componentInstance.getStatusClass('Sin lectura')).toBe('badge-soft-warning');
  });

  it('getStatusClass: should return badge-soft-danger for Moroso', () => {
    expect(fixture.componentInstance.getStatusClass('Moroso')).toBe('badge-soft-danger');
  });
});
