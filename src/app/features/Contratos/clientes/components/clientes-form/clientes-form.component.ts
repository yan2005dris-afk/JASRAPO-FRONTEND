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

import { ClientesService } from '../../services/clientes.service';
import {
  ActualizarClienteRequest,
  CrearClienteRequest,
  IClientes,
  IIdentificacion,
} from '../../interfaces/iclientes.interface';

type TipoMensajeFormulario = 'success' | 'error' | null;

interface BackendErrorResponse {
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string[]>;
}

@Component({
  selector: 'app-clientes-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clientes-form.component.html',
  styleUrl: './clientes-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesFormComponent implements OnInit {
  readonly formClosed = output<void>();
  readonly formSubmitted = output<void>();

  readonly clienteAEditar = input<IClientes | null>(null);

  private readonly clientesService = inject(ClientesService);
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

    aplicaTerceraEdad: [false],
    aplicaDiscapacidad: [false],

    direccionDomicilio: ['', Validators.required],
  });

  ngOnInit(): void {
    this.isEditMode = this.clienteAEditar() !== null;

    this.cargarTiposIdentificacion();
    this.aplicarValidacionesPorTipo();
  }

  cargarTiposIdentificacion(): void {
    this.clientesService.getTiposIdentificacion().subscribe({
      next: (tipos) => {
        this.tiposIdentificacion = tipos
          .filter((tipo) => tipo.activo)
          .sort((a, b) => Number(a.orden) - Number(b.orden));

        this.prepararFormulario();

        if (!this.isEditMode && this.tiposIdentificacion.length > 0) {
          this.clienteForm.patchValue({
            tipoIdentificacionId: String(this.tiposIdentificacion[0].identificacionId),
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

      aplicaTerceraEdad: cliente.aplicaTerceraEdad ?? false,
      aplicaDiscapacidad: cliente.aplicaDiscapacidad ?? false,

      direccionDomicilio: cliente.direccionDomicilio ?? '',
    });
  }

  obtenerTipoIdentificacionIdParaFormulario(cliente: IClientes): string {
    if (cliente.tipoIdentificacionId !== undefined && cliente.tipoIdentificacionId !== null) {
      return String(cliente.tipoIdentificacionId);
    }

    if (
      cliente.tipoIdentificacion &&
      typeof cliente.tipoIdentificacion === 'object' &&
      cliente.tipoIdentificacion.identificacionId
    ) {
      return String(cliente.tipoIdentificacion.identificacionId);
    }

    if (cliente.tipoIdentificacion && typeof cliente.tipoIdentificacion === 'string') {
      const tipoTexto = cliente.tipoIdentificacion.toUpperCase().trim();

      const tipoEncontrado = this.tiposIdentificacion.find((tipo) => {
        const codigo = tipo.codigo.toUpperCase().trim();
        const nombre = tipo.nombre.toUpperCase().trim();

        return codigo === tipoTexto || nombre === tipoTexto;
      });

      return tipoEncontrado ? String(tipoEncontrado.identificacionId) : '';
    }

    return '';
  }

  aplicarValidacionesPorTipo(): void {
    this.actualizarValidacionesPersona();

    this.tipoIdentificacionId?.valueChanges.subscribe(() => {
      this.actualizarValidacionesPersona();
      this.cdr.markForCheck();
    });
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
      (tipo) => String(tipo.identificacionId) === idSeleccionado,
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

  crearCliente(cliente: CrearClienteRequest): void {
    this.clientesService.createCliente(cliente).subscribe({
      next: () => {
        this.isSaving = false;
        this.mostrarMensaje('Cliente creado correctamente.', 'success');
        this.formSubmitted.emit();
        this.onClose();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;

        const mensajeError = this.obtenerMensajeErrorBackend(
          err,
          'No se pudo crear el cliente. Revise los datos ingresados.',
        );

        this.mostrarMensaje(mensajeError, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  actualizarCliente(cliente: ActualizarClienteRequest): void {
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

    this.clientesService.updateCliente(clienteId, cliente).subscribe({
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

        this.mostrarMensaje(mensajeError, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  prepararClienteParaEnviar(): CrearClienteRequest {
    const formValue = this.clienteForm.getRawValue();

    const cliente: CrearClienteRequest = {
      tipoIdentificacionId: Number(formValue.tipoIdentificacionId),

      identificacion: String(formValue.identificacion).trim(),

      nombres: String(formValue.nombres ?? '').trim() || undefined,
      apellidos: String(formValue.apellidos ?? '').trim() || undefined,
      razonSocial: String(formValue.razonSocial ?? '').trim() || null,

      email: String(formValue.email).trim(),
      telefono: String(formValue.telefono).trim(),
      telefonoSecundario: String(formValue.telefonoSecundario ?? '').trim() || null,

      aplicaTerceraEdad: Boolean(formValue.aplicaTerceraEdad),
      aplicaDiscapacidad: Boolean(formValue.aplicaDiscapacidad),

      direccionDomicilio: String(formValue.direccionDomicilio).trim(),
    };

    if (this.esPersonaJuridica()) {
      cliente.nombres = undefined;
      cliente.apellidos = undefined;
    } else {
      cliente.razonSocial = null;
    }

    return cliente;
  }

  obtenerIdCliente(cliente: IClientes): string | number | null {
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
