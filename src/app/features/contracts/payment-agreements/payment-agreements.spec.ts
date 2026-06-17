import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentAgreementsComponent } from './payment-agreements';

describe('PaymentAgreementsComponent', () => {
  let component: PaymentAgreementsComponent;
  let fixture: ComponentFixture<PaymentAgreementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentAgreementsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentAgreementsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
