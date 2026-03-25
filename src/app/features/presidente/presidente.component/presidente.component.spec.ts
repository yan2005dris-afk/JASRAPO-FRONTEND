import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PresidenteComponent } from './presidente.component';

describe('PresidenteComponent', () => {
  let component: PresidenteComponent;
  let fixture: ComponentFixture<PresidenteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresidenteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PresidenteComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
