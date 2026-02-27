import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricsGridComponent } from './metrics-grid.component';
import { MetricCard } from '../../models/metrics.model';

const mockMetrics: MetricCard[] = [
  { id: 'm1', title: 'M1', value: 1, trend: 'up', trendValue: 1, icon: 'bi bi-people', colorClass: 'metric-blue' },
];

describe('MetricsGridComponent', () => {
  let fixture: ComponentFixture<MetricsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MetricsGridComponent] }).compileComponents();
    fixture = TestBed.createComponent(MetricsGridComponent);
    fixture.componentRef.setInput('metrics', mockMetrics);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render one metric card', () => {
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('app-metric-card');
    expect(cards.length).toBe(1);
  });
});
