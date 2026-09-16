import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ClientsService } from '../../services/clients.service';
import {
  UpdateClientRequest,
  CreateClientRequest,
  IClient,
  IIdentificacion,
} from '../../interfaces/iclients.interface';
import { identificacionValidator } from '../../validators/identificacion.validator';
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';

const EDAD_TERCERA_EDAD = 65;

type TipoMensajeFormulario = 'success' | 'error' | null;

interface BackendErrorResponse {
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string[]>;
}

@Component({
  selector: 'app-clients-form',
  imports: [CommonModule, ReactiveFormsModule, DatePickerComponent],
  templateUrl: './clients-form.component.html',
  styleUrl: './clients-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsFormComponent implements OnInit {
  readonly formClosed = output<void>();
  readonly formSubmitted = output<void>();

  /**
   * Emite el cliente recién creado. Permite que quien abre el formulario como
   * modal (por ejemplo el selector de cliente del contrato) lo use al vuelo sin
   * volver a consultarlo al backend.
   */
  readonly clientCreated = output<IClient>();

  readonly clienteAEditar = input<IClient | null>(null);

  private readonly clientsService = inject(ClientsService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  isEditMode = false;
  isSaving = false;

  mensajeFormulario = '';
  tipoMensajeFormulario: TipoMensajeFormulario = null;

  tiposIdentificacion: IIdentificacion[] = [];

  clienteForm: FormGroup = this.fb.group({
    tipoIdentificacionId: ['', Validators.required],
    identificacion: ['', [Validators.required, Validators.minLength(5)]],

    nombres: [''],
    apellidos: [''],
    razonSocial: [''],

    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.minLength(7)]],
    telefonoSecundario: [''],

    fechaNacimiento: [''],
    aplicaDiscapacidad: [false],

    direccionDomicilio: ['', Validators.required],
  });

  ngOnInit(): void {
    this.isEditMode = this.clienteAEditar() !== null;

    this.cargarTiposIdentificacion();
    this.aplicarValidacionesPorTipo();
  }

  cargarTiposIdentificacion(): void {
    this.clientsService.getIdentificationTypes().subscribe({
      next: (tipos) => {
        this.tiposIdentificacion = tipos
          .filter((tipo) => tipo.activo !== false)
          .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

        this.prepararFormulario();

        if (!this.isEditMode && this.tiposIdentificacion.length > 0) {
          this.clienteForm.patchValue({
            tipoIdentificacionId: String(
              this.tiposIdentificacion[0].identificacionId ?? this.tiposIdentificacion[0].id,
            ),
          });
        }

        this.actualizarValidacionesPersona();
        this.cdr.markForCheck();
      },
      error: () => {
        this.mostrarMensaje('No se pudieron cargar los tipos de identificación.', 'error');
      },
    });
  }

  prepararFormulario(): void {
    const cliente = this.clienteAEditar();

    if (!cliente) {
      return;
    }

    this.isEditMode = true;

    this.clienteForm.patchValue({
      tipoIdentificacionId: this.obtenerTipoIdentificacionIdParaFormulario(cliente),
      identificacion: cliente.identificacion ?? '',

      nombres: cliente.nombres ?? '',
      apellidos: cliente.apellidos ?? '',
      razonSocial: cliente.razonSocial ?? '',

      email: cliente.email ?? '',
      telefono: cliente.telefono ?? '',
      telefonoSecundario: cliente.telefonoSecundario ?? '',

      aplicaDiscapacidad: cliente.aplicaDiscapacidad ?? false,

      direccionDomicilio: cliente.direccionDomicilio ?? '',
    });
  }

  obtenerTipoIdentificacionIdParaFormulario(cliente: IClient): string {
    if (cliente.tipoIdentificacionId !== undefined && cliente.tipoIdentificacionId !== null) {
      return String(cliente.tipoIdentificacionId);
    }

    if (
      cliente.tipoIdentificacion &&
      typeof cliente.tipoIdentificacion === 'object' &&
      (cliente.tipoIdentificacion.identificacionId || cliente.tipoIdentificacion.id)
    ) {
      return String(cliente.tipoIdentificacion.identificacionId ?? cliente.tipoIdentificacion.id);
    }

    if (cliente.tipoIdentificacion && typeof cliente.tipoIdentificacion === 'string') {
      const tipoTexto = cliente.tipoIdentificacion.toUpperCase().trim();

      const tipoEncontrado = this.tiposIdentificacion.find((tipo) => {
        const codigo = tipo.codigo.toUpperCase().trim();
        const nombre = (tipo.nombre || tipo.descripcion || '').toUpperCase().trim();

        return codigo === tipoTexto || nombre === tipoTexto;
      });

      return tipoEncontrado ? String(tipoEncontrado.identificacionId ?? tipoEncontrado.id) : '';
    }

    return '';
  }

  aplicarValidacionesPorTipo(): void {
    this.actualizarValidacionesPersona();
    this.actualizarValidacionIdentificacion();

    this.tipoIdentificacionId?.valueChanges.subscribe(() => {
      this.actualizarValidacionesPersona();
      this.actualizarValidacionIdentificacion();
      this.cdr.markForCheck();
    });
  }

  actualizarValidacionIdentificacion(): void {
    const identificacion = this.clienteForm.get('identificacion');
    const codigo = this.obtenerTipoIdentificacionSeleccionado()?.codigo ?? '';

    identificacion?.setValidators([
      Validators.required,
      Validators.minLength(5),
      identificacionValidator(codigo),
    ]);
    identificacion?.updateValueAndValidity({ emitEvent: false });
  }

  get esTerceraEdad(): boolean {
    const valor = this.clienteForm.get('fechaNacimiento')?.value;
    if (!valor) return false;
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return false;

    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const diferenciaMes = hoy.getMonth() - fecha.getMonth();
    if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }
    return edad >= EDAD_TERCERA_EDAD;
  }

  get fechaNacimiento(): string {
    return this.clienteForm.get('fechaNacimiento')?.value ?? '';
  }

  onFechaNacimientoChange(fecha: string): void {
    this.clienteForm.get('fechaNacimiento')?.setValue(fecha);
  }

  get identificacionInvalida(): boolean {
    const control = this.clienteForm.get('identificacion');
    return !!control?.hasError('identificacionInvalida') && (control.dirty || control.touched);
  }

  get etiquetaTipoIdentificacion(): string {
    const tipo = this.obtenerTipoIdentificacionSeleccionado();
    return tipo?.nombre || tipo?.descripcion || 'identificación';
  }

  actualizarValidacionesPersona(): void {
    const nombres = this.clienteForm.get('nombres');
    const apellidos = this.clienteForm.get('apellidos');
    const razonSocial = this.clienteForm.get('razonSocial');

    nombres?.clearValidators();
    apellidos?.clearValidators();
    razonSocial?.clearValidators();

    if (this.esPersonaJuridica()) {
      razonSocial?.setValidators([Validators.required]);

      nombres?.setValue('', { emitEvent: false });
      apellidos?.setValue('', { emitEvent: false });
    } else {
      nombres?.setValidators([Validators.required]);
      apellidos?.setValidators([Validators.required]);

      razonSocial?.setValue('', { emitEvent: false });
    }

    nombres?.updateValueAndValidity({ emitEvent: false });
    apellidos?.updateValueAndValidity({ emitEvent: false });
    razonSocial?.updateValueAndValidity({ emitEvent: false });
  }

  esPersonaJuridica(): boolean {
    const tipoSeleccionado = this.obtenerTipoIdentificacionSeleccionado();

    return tipoSeleccionado?.codigo === 'RUC' || tipoSeleccionado?.codigo === 'CONSUMIDOR_FINAL';
  }

  obtenerTipoIdentificacionSeleccionado(): IIdentificacion | undefined {
    const idSeleccionado = String(this.tipoIdentificacionId?.value ?? '');

    return this.tiposIdentificacion.find(
      (tipo) => String(tipo.identificacionId ?? tipo.id) === idSeleccionado,
    );
  }

  onClose(): void {
    this.formClosed.emit();
  }

  onSubmit(): void {
    this.limpiarMensaje();

    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      this.mostrarMensaje('Revise los campos obligatorios antes de guardar.', 'error');
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    const cliente = this.prepararClienteParaEnviar();

    if (this.isEditMode && this.clienteAEditar()) {
      this.actualizarCliente(cliente);
      return;
    }

    this.crearCliente(cliente);
  }

  crearCliente(cliente: CreateClientRequest): void {
    this.clientsService.createClient(cliente).subscribe({
      next: (clienteCreado) => {
        this.isSaving = false;
        this.mostrarMensaje('Cliente creado correctamente.', 'success');
        this.formSubmitted.emit();
        this.onClose();
        this.cdr.markForCheck();
        // Se emite al final: quien escucha puede cerrar el selector que contiene
        // a este formulario, y con él destruir esta vista.
        if (clienteCreado) {
          this.clientCreated.emit(clienteCreado);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;

        const mensajeError = this.obtenerMensajeErrorBackend(
          err,
          'No se pudo crear el cliente. Revise los datos ingresados.',
        );

        this.aplicarErrorBackendAControl(mensajeError);
        this.mostrarMensaje(mensajeError, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  actualizarCliente(cliente: UpdateClientRequest): void {
    const clienteActual = this.clienteAEditar();

    if (!clienteActual) {
      this.isSaving = false;
      this.mostrarMensaje('No se encontró información del cliente a actualizar.', 'error');
      this.cdr.markForCheck();
      return;
    }

    const clienteId = this.obtenerIdCliente(clienteActual);

    if (clienteId === null) {
      this.isSaving = false;
      this.mostrarMensaje(
        'No se puede actualizar este cliente porque no tiene un ID válido.',
        'error',
      );
      this.cdr.markForCheck();
      return;
    }

    this.clientsService.updateClient(clienteId, cliente).subscribe({
      next: () => {
        this.isSaving = false;
        this.mostrarMensaje('Cliente actualizado correctamente.', 'success');
        this.formSubmitted.emit();
        this.onClose();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;

        const mensajeError = this.obtenerMensajeErrorBackend(
          err,
          'No se pudo actualizar el cliente. Revise los datos ingresados.',
        );

        this.aplicarErrorBackendAControl(mensajeError);
        this.mostrarMensaje(mensajeError, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  prepararClienteParaEnviar(): CreateClientRequest {
    const formValue = this.clienteForm.getRawValue();

    const cliente: CreateClientRequest = {
      tipoIdentificacionId: Number(formValue.tipoIdentificacionId),

      identificacion: String(formValue.identificacion).trim(),

      nombres: String(formValue.nombres ?? '').trim() || undefined,
      apellidos: String(formValue.apellidos ?? '').trim() || undefined,
      razonSocial: String(formValue.razonSocial ?? '').trim() || null,

      email: String(formValue.email).trim(),
      telefono: String(formValue.telefono).trim(),
      telefonoSecundario: String(formValue.telefonoSecundario ?? '').trim() || null,

      aplicaDiscapacidad: Boolean(formValue.aplicaDiscapacidad),

      direccionDomicilio: String(formValue.direccionDomicilio).trim(),
    };

    const fechaNacimiento = String(formValue.fechaNacimiento ?? '').trim();
    if (fechaNacimiento) {
      cliente.fechaNacimiento = fechaNacimiento;
    }

    if (this.esPersonaJuridica()) {
      cliente.nombres = undefined;
      cliente.apellidos = undefined;
    } else {
      cliente.razonSocial = null;
    }

    return cliente;
  }

  obtenerIdCliente(cliente: IClient): string | number | null {
    return cliente.id ?? cliente.clienteId ?? cliente.clientId ?? cliente._id ?? null;
  }

  campoInvalido(campo: string): boolean {
    const control = this.clienteForm.get(campo);

    return !!control && control.invalid && (control.dirty || control.touched);
  }

  mostrarMensaje(mensaje: string, tipo: TipoMensajeFormulario): void {
    this.mensajeFormulario = mensaje;
    this.tipoMensajeFormulario = tipo;
    this.cdr.markForCheck();
  }

  limpiarMensaje(): void {
    this.mensajeFormulario = '';
    this.tipoMensajeFormulario = null;
  }

  private aplicarErrorBackendAControl(mensaje: string): void {
    if (mensaje.toLowerCase().includes('identificaci')) {
      const control = this.clienteForm.get('identificacion');
      control?.setErrors({ ...(control.errors ?? {}), servidor: mensaje });
      control?.markAsTouched();
    }
  }

  private obtenerMensajeErrorBackend(err: HttpErrorResponse, mensajePorDefecto: string): string {
    const errorBackend = err.error as BackendErrorResponse | string | null;

    if (typeof errorBackend === 'string' && errorBackend.trim()) {
      return errorBackend;
    }

    if (!errorBackend || typeof errorBackend !== 'object') {
      return mensajePorDefecto;
    }

    if (errorBackend.message) {
      return errorBackend.message;
    }

    if (errorBackend.error) {
      return errorBackend.error;
    }

    if (Array.isArray(errorBackend.errors) && errorBackend.errors.length > 0) {
      return errorBackend.errors.join(' ');
    }

    if (errorBackend.errors && typeof errorBackend.errors === 'object') {
      const mensajes = Object.values(errorBackend.errors).flat();

      if (mensajes.length > 0) {
        return mensajes.join(' ');
      }
    }

    return mensajePorDefecto;
  }

  get tipoIdentificacionId(): AbstractControl | null {
    return this.clienteForm.get('tipoIdentificacionId');
  }
}
