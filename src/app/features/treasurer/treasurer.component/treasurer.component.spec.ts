import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasurerComponent } from './tesorero.component';

describe('TreasurerComponent', () => {
  let component: TreasurerComponent;
  let fixture: ComponentFixture<TreasurerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasurerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreasurerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
