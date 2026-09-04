import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ClientsService } from '../../services/clients.service';
import {
  UpdateClientRequest,
  CreateClientRequest,
  IClient,
  IIdentificacion,
} from '../../interfaces/iclients.interface';

export type TipoMensajeFormulario = 'success' | 'error' | null;

export const NOMBRE_PATTERN = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s-]+$/;
export const TELEFONO_PATTERN = /^[0-9]{10}$/;
export const TELEFONO_SECUNDARIO_PATTERN = /^[0-9]{7,10}$/;

export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
    const isWhitespace = String(control.value).trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  };
}

interface BackendErrorResponse {
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string[]>;
}

@Component({
  selector: 'app-clients-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clients-form.component.html',
  styleUrl: './clients-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsFormComponent implements OnInit {
  readonly formClosed = output<void>();
  readonly formSubmitted = output<void>();

  readonly clienteAEditar = input<IClient | null>(null);

  private readonly clientsService = inject(ClientsService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly isEditMode = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  readonly mensajeFormulario = signal<string>('');
  readonly tipoMensajeFormulario = signal<TipoMensajeFormulario>(null);

  readonly tiposIdentificacion = signal<IIdentificacion[]>([]);

  clienteForm: FormGroup = this.fb.group({
    tipoIdentificacionId: ['', Validators.required],
    identificacion: [
      '',
      [
        Validators.required,
        noWhitespaceValidator(),
        Validators.minLength(5),
        Validators.maxLength(13),
      ],
    ],

    nombres: [
      '',
      [
        Validators.required,
        noWhitespaceValidator(),
        Validators.pattern(NOMBRE_PATTERN),
        Validators.maxLength(100),
      ],
    ],
    apellidos: [
      '',
      [
        Validators.required,
        noWhitespaceValidator(),
        Validators.pattern(NOMBRE_PATTERN),
        Validators.maxLength(100),
      ],
    ],
    razonSocial: [''],

    email: [
      '',
      [Validators.required, noWhitespaceValidator(), Validators.email, Validators.maxLength(100)],
    ],
    telefono: [
      '',
      [
        Validators.required,
        noWhitespaceValidator(),
        Validators.maxLength(10),
        Validators.pattern(TELEFONO_PATTERN),
      ],
    ],
    telefonoSecundario: ['', [Validators.pattern(TELEFONO_SECUNDARIO_PATTERN)]],

    aplicaTerceraEdad: [false],
    aplicaDiscapacidad: [false],

    direccionDomicilio: [
      '',
      [Validators.required, noWhitespaceValidator(), Validators.maxLength(250)],
    ],
  });

  ngOnInit(): void {
    this.isEditMode.set(this.clienteAEditar() !== null);

    this.cargarTiposIdentificacion();
  }

  soloNumeros(event: Event, campo: string): void {
    const input = event.target as HTMLInputElement;
    const valorLimpio = input.value.replace(/[^0-9]/g, '');

    if (input.value !== valorLimpio) {
      input.value = valorLimpio;
    }

    const control = this.clienteForm.get(campo);
    if (control && control.value !== valorLimpio) {
      control.setValue(valorLimpio, { emitEvent: true });
    }
  }

  validarNombreCompleto(event: Event, campo: string): void {
    const input = event.target as HTMLInputElement;
    const valorLimpio = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s-]/g, '');

    if (input.value !== valorLimpio) {
      input.value = valorLimpio;
    }

    const control = this.clienteForm.get(campo);
    if (control && control.value !== valorLimpio) {
      control.setValue(valorLimpio, { emitEvent: true });
    }
  }

  async cargarTiposIdentificacion(): Promise<void> {
    try {
      const tipos = await firstValueFrom(this.clientsService.getIdentificationTypes());
      const tiposFiltrados = tipos
        .filter((tipo) => tipo.activo !== false)
        .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

      this.tiposIdentificacion.set(tiposFiltrados);
      this.prepararFormulario();

      if (!this.isEditMode() && tiposFiltrados.length > 0) {
        const primerId = String(tiposFiltrados[0].identificacionId ?? tiposFiltrados[0].id);
        this.clienteForm.patchValue({
          tipoIdentificacionId: primerId,
        });
      }

      this.actualizarValidacionesPersona();
      this.cdr.markForCheck();
    } catch {
      this.mostrarMensaje('No se pudieron cargar los tipos de identificación.', 'error');
    }
  }

  prepararFormulario(): void {
    const cliente = this.clienteAEditar();

    if (!cliente) {
      return;
    }

    this.isEditMode.set(true);

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

      const tipoEncontrado = this.tiposIdentificacion().find((tipo) => {
        const codigo = tipo.codigo.toUpperCase().trim();
        const nombre = (tipo.nombre || tipo.descripcion || '').toUpperCase().trim();

        return codigo === tipoTexto || nombre === tipoTexto;
      });

      return tipoEncontrado ? String(tipoEncontrado.identificacionId ?? tipoEncontrado.id) : '';
    }

    return '';
  }

  onTipoIdentificacionChange(): void {
    this.actualizarValidacionesPersona();
    this.cdr.markForCheck();
  }

  actualizarValidacionesPersona(): void {
    const nombres = this.clienteForm.get('nombres');
    const apellidos = this.clienteForm.get('apellidos');
    const razonSocial = this.clienteForm.get('razonSocial');
    const identificacion = this.clienteForm.get('identificacion');

    if (this.esConsumidorFinal()) {
      identificacion?.setValue('9999999999999');
      identificacion?.disable();
    } else {
      if (identificacion?.disabled) {
        identificacion.enable();
        if (identificacion.value === '9999999999999') {
          identificacion.setValue('');
        }
      }
    }

    nombres?.clearValidators();
    apellidos?.clearValidators();
    razonSocial?.clearValidators();

    if (this.esPersonaJuridica()) {
      razonSocial?.setValidators([
        Validators.required,
        noWhitespaceValidator(),
        Validators.maxLength(150),
      ]);

      nombres?.setValue('', { emitEvent: false });
      apellidos?.setValue('', { emitEvent: false });
    } else {
      nombres?.setValidators([
        Validators.required,
        noWhitespaceValidator(),
        Validators.pattern(NOMBRE_PATTERN),
        Validators.maxLength(100),
      ]);

      apellidos?.setValidators([
        Validators.required,
        noWhitespaceValidator(),
        Validators.pattern(NOMBRE_PATTERN),
        Validators.maxLength(100),
      ]);

      razonSocial?.setValue('', { emitEvent: false });
    }

    nombres?.updateValueAndValidity({ emitEvent: false });
    apellidos?.updateValueAndValidity({ emitEvent: false });
    razonSocial?.updateValueAndValidity({ emitEvent: false });
    identificacion?.updateValueAndValidity({ emitEvent: false });
  }

  esConsumidorFinal(): boolean {
    const tipoSeleccionado = this.obtenerTipoIdentificacionSeleccionado();
    if (!tipoSeleccionado) return false;

    const codigo = (tipoSeleccionado.codigo || '').toUpperCase().trim();
    const nombre = (tipoSeleccionado.nombre || tipoSeleccionado.descripcion || '')
      .toUpperCase()
      .trim();

    return (
      codigo === 'CONSUMIDOR_FINAL' ||
      codigo === 'CONSUMIDOR FINAL' ||
      nombre.includes('CONSUMIDOR FINAL')
    );
  }

  esPasaporte(): boolean {
    const tipoSeleccionado = this.obtenerTipoIdentificacionSeleccionado();
    if (!tipoSeleccionado) return false;

    const codigo = (tipoSeleccionado.codigo || '').toUpperCase().trim();
    const nombre = (tipoSeleccionado.nombre || tipoSeleccionado.descripcion || '')
      .toUpperCase()
      .trim();

    return codigo === 'PASAPORTE' || nombre.includes('PASAPORTE');
  }

  esPersonaJuridica(): boolean {
    const tipoSeleccionado = this.obtenerTipoIdentificacionSeleccionado();
    if (!tipoSeleccionado) return false;

    const codigo = (tipoSeleccionado.codigo || '').toUpperCase().trim();
    const nombre = (tipoSeleccionado.nombre || tipoSeleccionado.descripcion || '')
      .toUpperCase()
      .trim();

    return (
      codigo === 'RUC' ||
      codigo === 'CONSUMIDOR_FINAL' ||
      nombre.includes('RUC') ||
      nombre.includes('CONSUMIDOR FINAL')
    );
  }

  obtenerTipoIdentificacionSeleccionado(): IIdentificacion | undefined {
    const idSeleccionado = String(this.tipoIdentificacionId?.value ?? '');

    return this.tiposIdentificacion().find(
      (tipo) => String(tipo.identificacionId ?? tipo.id) === idSeleccionado,
    );
  }

  async verificarUnicidadCorreo(): Promise<boolean> {
    const emailControl = this.clienteForm.get('email');
    if (!emailControl || emailControl.invalid || !emailControl.value) {
      return true;
    }

    const emailVal = String(emailControl.value).trim().toLowerCase();
    const clienteActual = this.clienteAEditar();
    const currentId = clienteActual ? this.obtenerIdCliente(clienteActual) : undefined;

    try {
      const res = await firstValueFrom(
        this.clientsService.searchClients({ email: emailVal, limit: 20 }),
      );
      const lista = res.data || [];

      const existeDuplicado = lista.some((c) => {
        const cId = this.obtenerIdCliente(c);
        const mismoEmail = c.email?.toLowerCase().trim() === emailVal;
        const diferenteCliente =
          currentId === undefined || currentId === null || String(cId) !== String(currentId);

        return mismoEmail && diferenteCliente;
      });

      if (existeDuplicado) {
        emailControl.setErrors({ ...emailControl.errors, emailDuplicado: true });
        this.cdr.markForCheck();
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  onClose(): void {
    this.formClosed.emit();
  }

  async onSubmit(): Promise<void> {
    this.limpiarMensaje();

    const esEmailUnico = await this.verificarUnicidadCorreo();

    if (this.clienteForm.invalid || !esEmailUnico) {
      this.clienteForm.markAllAsTouched();
      this.mostrarMensaje('Revise los campos obligatorios antes de guardar.', 'error');
      return;
    }

    this.isSaving.set(true);
    this.cdr.markForCheck();

    const cliente = this.prepararClienteParaEnviar();

    try {
      if (this.isEditMode() && this.clienteAEditar()) {
        await this.actualizarCliente(cliente);
      } else {
        await this.crearCliente(cliente);
      }
    } catch (err: unknown) {
      this.isSaving.set(false);
      const httpErr = err as HttpErrorResponse;

      const mensajeError = this.obtenerMensajeErrorBackend(
        httpErr,
        'No se pudo guardar la información del cliente. Revise los datos ingresados.',
      );

      if (
        mensajeError.toLowerCase().includes('correo') ||
        mensajeError.toLowerCase().includes('email')
      ) {
        this.clienteForm.get('email')?.setErrors({ emailDuplicado: true });
      }

      this.mostrarMensaje(mensajeError, 'error');
      this.cdr.markForCheck();
    }
  }

  async crearCliente(cliente: CreateClientRequest): Promise<void> {
    await firstValueFrom(this.clientsService.createClient(cliente));
    this.isSaving.set(false);
    this.mostrarMensaje('Cliente creado correctamente.', 'success');
    this.formSubmitted.emit();
    this.onClose();
    this.cdr.markForCheck();
  }

  async actualizarCliente(cliente: UpdateClientRequest): Promise<void> {
    const clienteActual = this.clienteAEditar();

    if (!clienteActual) {
      this.isSaving.set(false);
      this.mostrarMensaje('No se encontró información del cliente a actualizar.', 'error');
      this.cdr.markForCheck();
      return;
    }

    const clienteId = this.obtenerIdCliente(clienteActual);

    if (clienteId === null) {
      this.isSaving.set(false);
      this.mostrarMensaje(
        'No se puede actualizar este cliente porque no tiene un ID válido.',
        'error',
      );
      this.cdr.markForCheck();
      return;
    }

    await firstValueFrom(this.clientsService.updateClient(clienteId, cliente));
    this.isSaving.set(false);
    this.mostrarMensaje('Cliente actualizado correctamente.', 'success');
    this.formSubmitted.emit();
    this.onClose();
    this.cdr.markForCheck();
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

  obtenerIdCliente(cliente: IClient): string | number | null {
    return cliente.id ?? cliente.clienteId ?? cliente.clientId ?? cliente._id ?? null;
  }

  campoInvalido(campo: string): boolean {
    const control = this.clienteForm.get(campo);

    return !!control && control.invalid && (control.dirty || control.touched);
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.clienteForm.get(campo);
    if (!control || !control.errors) {
      return '';
    }

    if (control.hasError('required') || control.hasError('whitespace')) {
      switch (campo) {
        case 'nombres':
          return 'Los nombres son obligatorios.';
        case 'apellidos':
          return 'Los apellidos son obligatorios.';
        case 'razonSocial':
          return 'La razón social es obligatoria.';
        case 'direccionDomicilio':
          return 'La dirección domiciliaria es obligatoria.';
        case 'identificacion':
          return 'La identificación es obligatoria.';
        case 'email':
          return 'El correo electrónico es obligatorio.';
        case 'telefono':
          return 'El teléfono es obligatorio.';
        case 'tipoIdentificacionId':
          return 'El tipo de identificación es obligatorio.';
        default:
          return 'Este campo es obligatorio.';
      }
    }

    if (control.hasError('pattern')) {
      switch (campo) {
        case 'nombres':
          return 'Los nombres solo deben contener letras, tildes, ñ y guion medio.';
        case 'apellidos':
          return 'Los apellidos solo deben contener letras, tildes, ñ y guion medio.';
        case 'telefono':
          return 'El teléfono debe contener únicamente 10 dígitos numéricos.';
        case 'telefonoSecundario':
          return 'El teléfono secundario debe contener solo dígitos numéricos (entre 7 y 10 dígitos).';
        default:
          return 'El formato del campo no es válido.';
      }
    }

    if (control.hasError('email')) {
      return 'Ingrese un correo electrónico válido.';
    }

    if (control.hasError('emailDuplicado')) {
      return 'El correo electrónico ya se encuentra registrado.';
    }

    if (control.hasError('maxlength')) {
      const max = control.errors['maxlength']?.requiredLength;
      return `No puede exceder los ${max} caracteres.`;
    }

    if (control.hasError('minlength')) {
      const min = control.errors['minlength']?.requiredLength;
      return `Debe tener al menos ${min} caracteres.`;
    }

    return 'Campo no válido.';
  }

  mostrarMensaje(mensaje: string, tipo: TipoMensajeFormulario): void {
    this.mensajeFormulario.set(mensaje);
    this.tipoMensajeFormulario.set(tipo);
    this.cdr.markForCheck();
  }

  limpiarMensaje(): void {
    this.mensajeFormulario.set('');
    this.tipoMensajeFormulario.set(null);
  }

  private obtenerMensajeErrorBackend(err: HttpErrorResponse, mensajePorDefecto: string): string {
    const errorBackend = err?.error as BackendErrorResponse | string | null;

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
