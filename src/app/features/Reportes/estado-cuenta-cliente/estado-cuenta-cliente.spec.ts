import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadoCuentaCliente } from './estado-cuenta-cliente';

describe('EstadoCuentaCliente', () => {
  let component: EstadoCuentaCliente;
  let fixture: ComponentFixture<EstadoCuentaCliente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstadoCuentaCliente],
    }).compileComponents();

    fixture = TestBed.createComponent(EstadoCuentaCliente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
