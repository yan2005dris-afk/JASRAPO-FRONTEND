import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverdueAccountsComponent } from './overdue-accounts';

describe('OverdueAccountsComponent', () => {
  let component: OverdueAccountsComponent;
  let fixture: ComponentFixture<OverdueAccountsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverdueAccountsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OverdueAccountsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
