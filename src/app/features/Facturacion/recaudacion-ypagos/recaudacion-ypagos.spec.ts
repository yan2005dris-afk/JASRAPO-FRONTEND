import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecaudacionYPagos } from './recaudacion-ypagos';

describe('RecaudacionYPagos', () => {
  let component: RecaudacionYPagos;
  let fixture: ComponentFixture<RecaudacionYPagos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecaudacionYPagos],
    }).compileComponents();

    fixture = TestBed.createComponent(RecaudacionYPagos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
