import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { OperatorProfileComponent } from './operator-profile.component';
import { AuthService } from '../../../core/services/auth.service';
import { NetworkService } from '../../../core/services/network.service';

describe('OperatorProfileComponent', () => {
  let fixture: ComponentFixture<OperatorProfileComponent>;
  let component: OperatorProfileComponent;
  let authServiceMock: {
    currentUser: ReturnType<typeof signal>;
    logout: ReturnType<typeof vi.fn>;
  };
  let networkServiceMock: {
    isOnline: ReturnType<typeof signal>;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      currentUser: signal({
        id: '123',
        name: 'Pedro Sanchez',
        email: 'pedro@jasrapo.gob.ec',
        roleId: 2,
        roleName: 'Operador de Campo',
      }),
      logout: vi.fn(),
    };

    networkServiceMock = {
      isOnline: signal(true),
    };

    await TestBed.configureTestingModule({
      imports: [OperatorProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: NetworkService, useValue: networkServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(OperatorProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe calcular las iniciales del operador correctamente', () => {
    expect(component.userInitials()).toBe('PS');
  });

  it('debe mostrar los datos del usuario en la pantalla', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pedro Sanchez');
    expect(compiled.textContent).toContain('pedro@jasrapo.gob.ec');
    expect(compiled.textContent).toContain('Operador de Campo');
  });

  it('debe navegar de vuelta a inicio cuando se hace click en Volver', () => {
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/app/operador/inicio']);
  });

  it('debe llamar a logout cuando se hace click en Cerrar Sesión', () => {
    component.onLogout();
    expect(authServiceMock.logout).toHaveBeenCalled();
  });
});
