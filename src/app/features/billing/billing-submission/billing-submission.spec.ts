import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillingSubmissionComponent } from './billing-submission';

describe('BillingSubmissionComponent', () => {
  let component: BillingSubmissionComponent;
  let fixture: ComponentFixture<BillingSubmissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingSubmissionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BillingSubmissionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
