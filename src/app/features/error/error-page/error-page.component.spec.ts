import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ErrorPageComponent } from './error-page.component';

import { AuthService } from '../../../core/services/auth.service';

describe('ErrorPageComponent', () => {
  let component: ErrorPageComponent;
  let fixture: ComponentFixture<ErrorPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => false,
            getDefaultRoute: () => '/login',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
