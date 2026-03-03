import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Medidores } from './medidores';

describe('Medidores', () => {
  let component: Medidores;
  let fixture: ComponentFixture<Medidores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Medidores]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Medidores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
