import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditDebitNotesComponent } from './notas-de-credito-debito';

describe('CreditDebitNotesComponent', () => {
  let component: CreditDebitNotesComponent;
  let fixture: ComponentFixture<CreditDebitNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditDebitNotesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditDebitNotesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
