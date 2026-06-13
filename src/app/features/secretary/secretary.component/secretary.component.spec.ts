import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecretaryComponent } from './secretary.component';

describe('SecretaryComponent', () => {
  let component: SecretaryComponent;
  let fixture: ComponentFixture<SecretaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecretaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SecretaryComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
