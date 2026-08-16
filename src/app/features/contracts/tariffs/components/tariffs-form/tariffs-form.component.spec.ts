import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TariffsFormComponent } from './tariffs-form.component';

describe('TariffsFormComponent', () => {
  let component: TariffsFormComponent;
  let fixture: ComponentFixture<TariffsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TariffsFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TariffsFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
