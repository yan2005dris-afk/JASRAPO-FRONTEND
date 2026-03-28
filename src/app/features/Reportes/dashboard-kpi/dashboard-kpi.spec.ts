import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardKpi } from './dashboard-kpi';

describe('DashboardKpi', () => {
  let component: DashboardKpi;
  let fixture: ComponentFixture<DashboardKpi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardKpi],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardKpi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
