import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturacionElectronica } from './facturacion-electronica';

describe('FacturacionElectronica', () => {
  let component: FacturacionElectronica;
  let fixture: ComponentFixture<FacturacionElectronica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturacionElectronica]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturacionElectronica);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
