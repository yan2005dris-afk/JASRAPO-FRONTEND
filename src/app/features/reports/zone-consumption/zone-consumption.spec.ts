import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoneConsumptionComponent } from './zone-consumption';

describe('ZoneConsumptionComponent', () => {
  let component: ZoneConsumptionComponent;
  let fixture: ComponentFixture<ZoneConsumptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoneConsumptionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ZoneConsumptionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
