import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PresidentComponent } from './presidente.component';

describe('PresidentComponent', () => {
  let component: PresidentComponent;
  let fixture: ComponentFixture<PresidentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresidentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresidentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
