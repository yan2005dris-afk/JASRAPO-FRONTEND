import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConveniosDePago } from './convenios-de-pago';

describe('ConveniosDePago', () => {
  let component: ConveniosDePago;
  let fixture: ComponentFixture<ConveniosDePago>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConveniosDePago]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConveniosDePago);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
