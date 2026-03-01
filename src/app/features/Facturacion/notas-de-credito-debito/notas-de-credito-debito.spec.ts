import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotasDeCreditoDebito } from './notas-de-credito-debito';

describe('NotasDeCreditoDebito', () => {
  let component: NotasDeCreditoDebito;
  let fixture: ComponentFixture<NotasDeCreditoDebito>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotasDeCreditoDebito]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotasDeCreditoDebito);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
