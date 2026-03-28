import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneracionPlanilla } from './generacion-planilla';

describe('GeneracionPlanilla', () => {
  let component: GeneracionPlanilla;
  let fixture: ComponentFixture<GeneracionPlanilla>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneracionPlanilla],
    }).compileComponents();

    fixture = TestBed.createComponent(GeneracionPlanilla);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
