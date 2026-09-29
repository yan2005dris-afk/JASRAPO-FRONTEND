import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ClientsApi } from '../../data/clients.api';
import { CreateClientRequest, IClient, IIdentificacion } from '../../domain/models/client.model';
import { ClientsFormComponent } from './clients-form.component';

describe('ClientsFormComponent', () => {
  let component: ClientsFormComponent;
  let fixture: ComponentFixture<ClientsFormComponent>;
  let clientsServiceSpy: {
    getIdentificationTypes: ReturnType<typeof vi.fn>;
    searchClients: ReturnType<typeof vi.fn>;
    createClient: ReturnType<typeof vi.fn>;
    updateClient: ReturnType<typeof vi.fn>;
  };

  const mockTiposIdentificacion: IIdentificacion[] = [
    {
      id: 1,
      identificacionId: 1,
      codigo: 'CEDULA',
      nombre: 'Cédula de Identidad',
      activo: true,
      orden: 1,
    },
    {
      id: 2,
      identificacionId: 2,
      codigo: 'RUC',
      nombre: 'RUC',
      activo: true,
      orden: 2,
    },
    {
      id: 3,
      identificacionId: 3,
      codigo: 'CONSUMIDOR_FINAL',
      nombre: 'Consumidor Final',
      activo: true,
      orden: 3,
    },
  ];

  beforeEach(async () => {
    clientsServiceSpy = {
      getIdentificationTypes: vi.fn().mockReturnValue(of(mockTiposIdentificacion)),
      searchClients: vi.fn().mockReturnValue(
        of({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 10,
            ultimaPagina: 1,
            paginaActual: 1,
            porPagina: 10,
            anterior: null,
            siguiente: null,
          },
        }),
      ),
      createClient: vi.fn().mockReturnValue(of({})),
      updateClient: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [ClientsFormComponent],
      providers: [{ provide: ClientsApi, useValue: clientsServiceSpy }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should invalidate nombres, apellidos, and direccionDomicilio if filled only with whitespace', () => {
    component.actualizarValidacionesPersona();

    const nombresControl = component.clienteForm.get('nombres');
    const apellidosControl = component.clienteForm.get('apellidos');
    const direccionControl = component.clienteForm.get('direccionDomicilio');

    nombresControl?.setValue('   ');
    apellidosControl?.setValue('   ');
    direccionControl?.setValue('   ');

    expect(nombresControl?.hasError('whitespace')).toBe(true);
    expect(apellidosControl?.hasError('whitespace')).toBe(true);
    expect(direccionControl?.hasError('whitespace')).toBe(true);
  });

  it('should reject numbers and special characters in nombres and apellidos', () => {
    component.actualizarValidacionesPersona();

    const nombresControl = component.clienteForm.get('nombres');
    const apellidosControl = component.clienteForm.get('apellidos');

    nombresControl?.setValue('Juan123');
    apellidosControl?.setValue('Pérez@#$');

    expect(nombresControl?.hasError('pattern')).toBe(true);
    expect(apellidosControl?.hasError('pattern')).toBe(true);

    nombresControl?.setValue('María José-Álvarez Ñúñez');
    apellidosControl?.setValue('Gómez-Díaz');

    expect(nombresControl?.valid).toBe(true);
    expect(apellidosControl?.valid).toBe(true);
  });

  it('should enforce maxlength on nombres and apellidos', () => {
    component.actualizarValidacionesPersona();

    const nombresControl = component.clienteForm.get('nombres');
    nombresControl?.setValue('a'.repeat(101));

    expect(nombresControl?.hasError('maxlength')).toBe(true);
  });

  it('should auto-complete 9999999999999 and disable input when Consumidor Final is selected', () => {
    component.clienteForm.patchValue({ tipoIdentificacionId: '3' });
    component.onTipoIdentificacionChange();

    const identificacionControl = component.clienteForm.get('identificacion');

    expect(identificacionControl?.value).toBe('9999999999999');
    expect(identificacionControl?.disabled).toBe(true);
  });

  it('should reject letters in telefono and require 10 digits', () => {
    const telefonoControl = component.clienteForm.get('telefono');

    telefonoControl?.setValue('098765432a');
    expect(telefonoControl?.hasError('pattern')).toBe(true);

    telefonoControl?.setValue('098765432'); // 9 digits
    expect(telefonoControl?.hasError('pattern')).toBe(true);

    telefonoControl?.setValue('0987654321'); // 10 digits
    expect(telefonoControl?.valid).toBe(true);
  });

  it('should validate optional telefonoSecundario with 7 to 10 digits only', () => {
    const telefonoSecControl = component.clienteForm.get('telefonoSecundario');

    telefonoSecControl?.setValue('');
    expect(telefonoSecControl?.valid).toBe(true);

    telefonoSecControl?.setValue('abc123');
    expect(telefonoSecControl?.hasError('pattern')).toBe(true);

    telefonoSecControl?.setValue('022345678');
    expect(telefonoSecControl?.valid).toBe(true);
  });

  it('muestra las condiciones especiales en cards individuales y accesibles con estado visual', () => {
    const host = fixture.nativeElement as HTMLElement;

    const cards = Array.from(host.querySelectorAll('.condition-card'));
    expect(cards.length).toBe(2);

    const terceraEdadCard = cards[0];
    expect(terceraEdadCard.textContent).toContain('Tercera edad');

    const discapacidadCard = cards[1];
    expect(discapacidadCard.textContent).toContain('Aplica discapacidad');

    const checkbox = host.querySelector<HTMLInputElement>('#aplicaDiscapacidad');
    const label = host.querySelector<HTMLLabelElement>('label[for="aplicaDiscapacidad"]');

    expect(checkbox).toBeTruthy();
    expect(checkbox?.type).toBe('checkbox');
    expect(label).toBeTruthy();
  });

  it('emite el cliente creado para que el selector lo use sin volver a buscarlo', () => {
    const clienteCreado = { clienteId: '77', nombres: 'Luis', apellidos: 'Vera' } as IClient;
    const clientsService = TestBed.inject(ClientsApi);
    vi.spyOn(clientsService, 'createClient').mockReturnValue(of(clienteCreado));

    const emitido = vi.fn();
    component.clientCreated.subscribe(emitido);

    component.crearCliente({} as CreateClientRequest);

    expect(emitido).toHaveBeenCalledWith(clienteCreado);
  });
});
