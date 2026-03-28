import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';

import { Clientes } from './clientes';

describe('Cliente', () => {
  let component: Clientes;
  let fixture: ComponentFixture<Clientes>;

  beforeEach(async () => {
    const mockAuthService = {
      logout: vi.fn(),
      token: signal(null),
      sid: signal(null),
      tokenCreatedAt: signal(null),
      tokenExpiresAt: signal(null),
      user: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [Clientes],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Clientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
