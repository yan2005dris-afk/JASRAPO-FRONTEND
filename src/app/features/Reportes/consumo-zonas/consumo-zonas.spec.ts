import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsumoZonas } from './consumo-zonas';

describe('ConsumoZonas', () => {
  let component: ConsumoZonas;
  let fixture: ComponentFixture<ConsumoZonas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsumoZonas],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsumoZonas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
