import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElectronicBillingComponent } from './facturacion-electronica';

describe('ElectronicBillingComponent', () => {
  let component: ElectronicBillingComponent;
  let fixture: ComponentFixture<ElectronicBillingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElectronicBillingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ElectronicBillingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
