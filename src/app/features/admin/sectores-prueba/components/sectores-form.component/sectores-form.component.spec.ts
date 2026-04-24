import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectoresFormComponent } from './sectores-form.component';

describe('SectoresFormComponent', () => {
  let component: SectoresFormComponent;
  let fixture: ComponentFixture<SectoresFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectoresFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SectoresFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
