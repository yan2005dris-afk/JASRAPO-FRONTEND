import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnvioDeFacturacion } from './envio-de-facturacion';

describe('EnvioDeFacturacion', () => {
  let component: EnvioDeFacturacion;
  let fixture: ComponentFixture<EnvioDeFacturacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvioDeFacturacion],
    }).compileComponents();

    fixture = TestBed.createComponent(EnvioDeFacturacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
