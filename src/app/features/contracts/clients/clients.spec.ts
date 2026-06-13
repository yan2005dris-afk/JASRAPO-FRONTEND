import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';

import { ClientsComponent } from './clientes';

describe('Cliente', () => {
  let component: ClientsComponent;
  let fixture: ComponentFixture<ClientsComponent>;

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
      imports: [ClientsComponent],
      providers: [{ provide: AuthService, useValue: mockAuthService }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
