import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContratosDeServicios } from './contratos-de-servicios';

describe('ContratosDeServicios', () => {
  let component: ContratosDeServicios;
  let fixture: ComponentFixture<ContratosDeServicios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContratosDeServicios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContratosDeServicios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
