import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricCardComponent } from './metric-card.component';
import { MetricCard } from '../../models/metrics.model';

const mockCard: MetricCard = {
  id: 'test',
  title: 'Test Metric',
  value: 42,
  trend: 'up',
  trendValue: 3,
  icon: 'bi bi-people-fill',
  colorClass: 'metric-blue',
};

describe('MetricCardComponent', () => {
  let component: MetricCardComponent;
  let fixture: ComponentFixture<MetricCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricCardComponent);
    fixture.componentRef.setInput('card', mockCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the card title', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.metric-card__title')?.textContent).toContain('Test Metric');
  });
});
