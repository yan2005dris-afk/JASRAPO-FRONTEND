import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  const mockAuthService = {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: signal(false),
    currentUser: signal(null),
    getDefaultRoute: vi.fn().mockReturnValue('/dashboard'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe inicializarse correctamente con el formulario y valores por defecto', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm.contains('email')).toBe(true);
    expect(component.loginForm.contains('password')).toBe(true);
    expect(component.showPassword()).toBe(false);
  });

  it('debe iniciar con la contraseña oculta respetando el estado inicial protegido', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const passwordInput = compiled.querySelector('#password') as HTMLInputElement;
    const toggleBtn = compiled.querySelector('.password-toggle-btn') as HTMLButtonElement;
    const icon = toggleBtn.querySelector('i');
    const statusMsg = toggleBtn.querySelector('[aria-live="polite"]');

    expect(passwordInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Ver contraseña');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
    expect(toggleBtn.getAttribute('title')).toContain('Contraseña oculta');
    expect(toggleBtn.getAttribute('aria-controls')).toBe('password');
    // Convención de estado (Meta/Facebook): al estar oculta, el ojo está tachado
    expect(icon?.classList.contains('bi-eye-slash')).toBe(true);
    expect(icon?.classList.contains('bi-eye')).toBe(false);
    expect(statusMsg?.textContent?.trim()).toBe('Contraseña protegida y oculta');
  });

  it('debe alternar la visibilidad al pulsar el botón e informar el cambio de estado del sistema', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const passwordInput = compiled.querySelector('#password') as HTMLInputElement;
    const toggleBtn = compiled.querySelector('.password-toggle-btn') as HTMLButtonElement;

    // Hacer clic para mostrar contraseña
    toggleBtn.click();
    fixture.detectChanges();

    expect(component.showPassword()).toBe(true);
    expect(passwordInput.type).toBe('text');
    expect(toggleBtn.classList.contains('active')).toBe(true);
    expect(toggleBtn.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');
    expect(toggleBtn.getAttribute('title')).toContain('Contraseña visible');

    // Convención de estado (Meta/Facebook): al estar visible, el ojo está abierto
    const icon = toggleBtn.querySelector('i');
    expect(icon?.classList.contains('bi-eye')).toBe(true);
    expect(icon?.classList.contains('bi-eye-slash')).toBe(false);

    const statusMsg = toggleBtn.querySelector('[aria-live="polite"]');
    expect(statusMsg?.textContent?.trim()).toBe('Contraseña visible en pantalla');

    // Hacer clic nuevamente para ocultar contraseña
    toggleBtn.click();
    fixture.detectChanges();

    expect(component.showPassword()).toBe(false);
    expect(passwordInput.type).toBe('password');
    expect(toggleBtn.classList.contains('active')).toBe(false);
    expect(toggleBtn.getAttribute('aria-label')).toBe('Ver contraseña');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
    expect(icon?.classList.contains('bi-eye-slash')).toBe(true);
    expect(statusMsg?.textContent?.trim()).toBe('Contraseña protegida y oculta');
  });
});
