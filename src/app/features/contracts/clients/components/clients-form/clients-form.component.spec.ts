import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ClientsService } from '../../services/clients.service';
import { CreateClientRequest, IClient } from '../../interfaces/iclients.interface';
import { ClientsFormComponent } from './clients-form.component';

describe('ClientsFormComponent', () => {
  let component: ClientsFormComponent;
  let fixture: ComponentFixture<ClientsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientsFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientsFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emite el cliente creado para que el selector lo use sin volver a buscarlo', () => {
    const clienteCreado = { clienteId: '77', nombres: 'Luis', apellidos: 'Vera' } as IClient;
    const clientsService = TestBed.inject(ClientsService);
    vi.spyOn(clientsService, 'createClient').mockReturnValue(of(clienteCreado));

    const emitido = vi.fn();
    component.clientCreated.subscribe(emitido);

    component.crearCliente({} as CreateClientRequest);

    expect(emitido).toHaveBeenCalledWith(clienteCreado);
  });
});
