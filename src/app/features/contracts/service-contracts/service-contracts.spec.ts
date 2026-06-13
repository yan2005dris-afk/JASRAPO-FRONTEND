import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceContractsComponent } from './service-contracts';

describe('ServiceContractsComponent', () => {
  let component: ServiceContractsComponent;
  let fixture: ComponentFixture<ServiceContractsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceContractsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceContractsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
