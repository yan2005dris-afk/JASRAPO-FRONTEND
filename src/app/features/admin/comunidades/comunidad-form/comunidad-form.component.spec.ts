import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComunidadFormComponent } from './comunidad-form.component';

describe('ComunidadFormComponent', () => {
  let component: ComunidadFormComponent;
  let fixture: ComponentFixture<ComunidadFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComunidadFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ComunidadFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
