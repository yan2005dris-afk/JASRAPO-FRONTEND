import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { By } from '@angular/platform-browser';

import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../users/services/users.service';
import { ToastService } from '../../shared/components/toast/toast.service';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;

  const mockAuthService = {
    currentUser: signal({ id: 1, userId: 1, name: 'Operador Test', email: 'op@test.com' }),
    updateCurrentUser: vi.fn(),
    logout: vi.fn(),
  };

  const mockUsersService = {
    getUserById: vi.fn().mockReturnValue(
      of({
        usuarioId: 1,
        nombres: 'Operador',
        apellidos: 'Test',
        email: 'op@test.com',
        telefono: '+593991234567',
        avatar: null,
        rol: { nombre: 'operadores' },
      }),
    ),
    updateMe: vi.fn().mockReturnValue(of({})),
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load user data', () => {
    expect(component).toBeTruthy();
    expect(mockUsersService.getUserById).toHaveBeenCalledWith(1);
    expect(component.profileForm.get('nombres')?.value).toBe('Operador');
  });

  it('calls authService.logout when Cerrar Sesión button is clicked', () => {
    const logoutBtn = fixture.debugElement.query(By.css('button.btn-outline-danger'));
    expect(logoutBtn).toBeTruthy();
    logoutBtn.nativeElement.click();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
