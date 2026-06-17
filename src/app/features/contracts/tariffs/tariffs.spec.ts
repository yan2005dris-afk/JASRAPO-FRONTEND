import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TariffsComponent } from './tariffs';

describe('TariffsComponent', () => {
  let component: TariffsComponent;
  let fixture: ComponentFixture<TariffsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TariffsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TariffsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
