import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { ClientsService } from './services/clients.service';
import { IClient } from './interfaces/iclients.interface';
import { ClientsComponent } from './clients.component';

describe('ClientsComponent', () => {
  let component: ClientsComponent;
  let fixture: ComponentFixture<ClientsComponent>;
  let clientsServiceSpy: { searchClients: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers();

    const mockAuthService = {
      logout: vi.fn(),
      token: signal(null),
      sid: signal(null),
      tokenCreatedAt: signal(null),
      tokenExpiresAt: signal(null),
      user: signal(null),
    };

    clientsServiceSpy = {
      searchClients: vi.fn().mockReturnValue(of({ data: [], meta: { total: 0 } })),
    };

    await TestBed.configureTestingModule({
      imports: [ClientsComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ClientsService, useValue: clientsServiceSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ejecuta búsqueda debounced al escribir término', () => {
    component.onSearchTermChange('0999999999');

    expect(clientsServiceSpy.searchClients).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(400);

    expect(clientsServiceSpy.searchClients).toHaveBeenCalledTimes(2);
    expect(clientsServiceSpy.searchClients).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: '0999999999' }),
    );
  });

  it('limpia búsqueda y recarga el listado', () => {
    component.onSearchTermChange('0999999999');
    vi.advanceTimersByTime(400);

    component.limpiarBusqueda();

    expect(component.searchTerm()).toBe('');
    expect(clientsServiceSpy.searchClients).toHaveBeenLastCalledWith({
      page: 1,
      limit: 5,
    });
  });

  it('en modo selección emite el cliente seleccionado', () => {
    fixture.componentRef.setInput('selectionMode', true);
    fixture.detectChanges();

    const seleccionado = vi.fn();
    component.clientSelected.subscribe(seleccionado);

    const cliente = { clienteId: '42', nombres: 'Ana', apellidos: 'Pérez' } as IClient;
    component.selectClient(cliente);

    expect(seleccionado).toHaveBeenCalledTimes(1);
    expect(seleccionado).toHaveBeenCalledWith(cliente);
  });

  it('fuera del modo selección no emite el cliente seleccionado', () => {
    const seleccionado = vi.fn();
    component.clientSelected.subscribe(seleccionado);

    component.selectClient({ clienteId: '42' } as IClient);

    expect(seleccionado).not.toHaveBeenCalled();
  });
});
