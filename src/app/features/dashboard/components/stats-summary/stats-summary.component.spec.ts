import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatsSummaryComponent } from './stats-summary.component';
import { DashboardStats } from '../../models/metrics.model';

const mockStats: DashboardStats = {
  totalClients: 6,
  activeClients: 4,
  delinquentClients: 1,
  pendingReadings: 1,
  totalConsumption: 510,
  averageConsumption: 85,
};

describe('StatsSummaryComponent', () => {
  let fixture: ComponentFixture<StatsSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatsSummaryComponent] }).compileComponents();
    fixture = TestBed.createComponent(StatsSummaryComponent);
    fixture.componentRef.setInput('stats', mockStats);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display total consumption', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('510');
  });
});
