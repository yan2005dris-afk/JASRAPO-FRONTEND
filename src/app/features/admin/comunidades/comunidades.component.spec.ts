import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComunidadesComponent } from './comunidades.component';

describe('ComunidadesComponent', () => {
  let component: ComunidadesComponent;
  let fixture: ComponentFixture<ComunidadesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComunidadesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ComunidadesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
