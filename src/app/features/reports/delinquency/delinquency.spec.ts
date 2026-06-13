import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelinquencyComponent } from './recaudacion-morosida';

describe('DelinquencyComponent', () => {
  let component: DelinquencyComponent;
  let fixture: ComponentFixture<DelinquencyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelinquencyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DelinquencyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
