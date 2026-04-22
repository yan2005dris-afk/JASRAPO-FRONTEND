import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectoresPrueba } from './sectores-prueba';

describe('SectoresPrueba', () => {
  let component: SectoresPrueba;
  let fixture: ComponentFixture<SectoresPrueba>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectoresPrueba]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SectoresPrueba);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
