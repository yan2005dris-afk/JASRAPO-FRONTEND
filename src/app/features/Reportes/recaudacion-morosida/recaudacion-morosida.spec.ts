import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecaudacionMorosida } from './recaudacion-morosida';

describe('RecaudacionMorosida', () => {
  let component: RecaudacionMorosida;
  let fixture: ComponentFixture<RecaudacionMorosida>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecaudacionMorosida],
    }).compileComponents();

    fixture = TestBed.createComponent(RecaudacionMorosida);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
