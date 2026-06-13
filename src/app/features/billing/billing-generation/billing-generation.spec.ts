import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillingGenerationComponent } from './generacion-planilla';

describe('BillingGenerationComponent', () => {
  let component: BillingGenerationComponent;
  let fixture: ComponentFixture<BillingGenerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingGenerationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BillingGenerationComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
