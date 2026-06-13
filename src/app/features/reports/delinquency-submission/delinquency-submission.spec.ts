import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelinquencySubmissionComponent } from './delinquency-submission';

describe('DelinquencySubmissionComponent', () => {
  let component: DelinquencySubmissionComponent;
  let fixture: ComponentFixture<DelinquencySubmissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelinquencySubmissionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DelinquencySubmissionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
