import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TesoreroComponent } from './tesorero.component';

describe('TesoreroComponent', () => {
  let component: TesoreroComponent;
  let fixture: ComponentFixture<TesoreroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TesoreroComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TesoreroComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
