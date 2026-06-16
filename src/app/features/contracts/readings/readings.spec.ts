import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadingsComponent } from './readings';

describe('ReadingsComponent', () => {
  let component: ReadingsComponent;
  let fixture: ComponentFixture<ReadingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
