import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarifasYCategorias } from './tarifas-ycategorias';

describe('TarifasYCategorias', () => {
  let component: TarifasYCategorias;
  let fixture: ComponentFixture<TarifasYCategorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarifasYCategorias],
    }).compileComponents();

    fixture = TestBed.createComponent(TarifasYCategorias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
