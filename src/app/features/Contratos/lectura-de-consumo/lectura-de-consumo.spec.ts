import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LecturaDeConsumo } from './lectura-de-consumo';

describe('LecturaDeConsumo', () => {
  let component: LecturaDeConsumo;
  let fixture: ComponentFixture<LecturaDeConsumo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LecturaDeConsumo],
    }).compileComponents();

    fixture = TestBed.createComponent(LecturaDeConsumo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
