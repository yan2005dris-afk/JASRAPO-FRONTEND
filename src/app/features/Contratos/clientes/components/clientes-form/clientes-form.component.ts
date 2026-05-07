import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ClientesService } from '../../services/clientes.service';
import {
  CrearClienteRequest,
  IClientes,
  IIdentificacion,
} from '../../interfaces/iclientes.interface';

@Component({
  selector: 'app-clientes-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clientes-form.component.html',
  styleUrl: './clientes-form.component.css',
})
export class ClientesFormComponent implements OnInit {
  @Output() formClosed = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<void>();

  @Input() clienteAEditar: IClientes | null = null;

  private readonly clientesService = inject(ClientesService);
  private readonly fb = inject(FormBuilder);

  isEditMode = false;
  isSaving = false;

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
    this.isEditMode = this.clienteAEditar !== null;

    this.cargarTiposIdentificacion();
    this.prepararFormulario();
    this.aplicarValidacionesPorTipo();
  }

  cargarTiposIdentificacion(): void {
    this.clientesService.getTiposIdentificacion().subscribe({
      next: (data) => {
        this.tiposIdentificacion = data
          .filter((tipo) => tipo.activo)
          .sort((a, b) => Number(a.orden) - Number(b.orden));

        if (this.isEditMode && this.clienteAEditar) {
          this.asignarTipoIdentificacionEnEdicion();
          return;
        }

        if (!this.isEditMode && this.tiposIdentificacion.length > 0) {
          this.clienteForm.patchValue({
            tipoIdentificacionId: this.tiposIdentificacion[0].identificacionId,
          });

          this.actualizarValidacionesPersona();
        }
      },
      error: (err) => {
        console.error('Error cargando tipos de identificación:', err);
      },
    });
  }

  prepararFormulario(): void {
    if (!this.clienteAEditar) {
      return;
    }

    this.clienteForm.patchValue({
      tipoIdentificacionId: this.clienteAEditar.tipoIdentificacionId ?? '',

      identificacion: this.clienteAEditar.identificacion ?? '',

      nombres: this.clienteAEditar.nombres ?? '',
      apellidos: this.clienteAEditar.apellidos ?? '',
      razonSocial: this.clienteAEditar.razonSocial ?? '',

      email: this.clienteAEditar.email ?? '',
      telefono: this.clienteAEditar.telefono ?? '',
      telefonoSecundario: this.clienteAEditar.telefonoSecundario ?? '',

      aplicaTerceraEdad: this.clienteAEditar.aplicaTerceraEdad ?? false,
      aplicaDiscapacidad: this.clienteAEditar.aplicaDiscapacidad ?? false,

      direccionDomicilio: this.clienteAEditar.direccionDomicilio ?? '',
    });
  }

  asignarTipoIdentificacionEnEdicion(): void {
    if (!this.clienteAEditar) {
      return;
    }

    if (this.clienteAEditar.tipoIdentificacionId) {
      this.clienteForm.patchValue({
        tipoIdentificacionId: String(this.clienteAEditar.tipoIdentificacionId),
      });

      this.actualizarValidacionesPersona();
      return;
    }

    if (this.clienteAEditar.tipoIdentificacion) {
      const tipoEncontrado = this.tiposIdentificacion.find(
        (tipo) => tipo.codigo === this.clienteAEditar?.tipoIdentificacion,
      );

      if (tipoEncontrado) {
        this.clienteForm.patchValue({
          tipoIdentificacionId: tipoEncontrado.identificacionId,
        });
      }
    }

    this.actualizarValidacionesPersona();
  }

  aplicarValidacionesPorTipo(): void {
    this.actualizarValidacionesPersona();

    this.tipoIdentificacionId?.valueChanges.subscribe(() => {
      this.actualizarValidacionesPersona();
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
    const tipoSeleccionado = this.obtenerTipoSeleccionado();

    if (!tipoSeleccionado) {
      return false;
    }

    return tipoSeleccionado.codigo === 'RUC' || tipoSeleccionado.codigo === 'CONSUMIDOR_FINAL';
  }

  obtenerTipoSeleccionado(): IIdentificacion | undefined {
    const tipoId = String(this.tipoIdentificacionId?.value ?? '');

    return this.tiposIdentificacion.find((tipo) => String(tipo.identificacionId) === tipoId);
  }

  onClose(): void {
    this.formClosed.emit();
  }

  onSubmit(): void {
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    const cliente = this.prepararClienteParaEnviar();

    console.log('Cliente enviado al backend:', cliente);

    if (this.isEditMode && this.clienteAEditar) {
      const clienteId = this.obtenerIdCliente(this.clienteAEditar);

      if (clienteId === null) {
        console.error('No se puede actualizar porque el cliente no tiene id.');
        alert('No se puede actualizar este cliente porque no tiene un ID válido.');
        this.isSaving = false;
        return;
      }

      this.clientesService.updateCliente(clienteId, cliente).subscribe({
        next: (response) => {
          console.log('Cliente actualizado correctamente:', response);
          this.isSaving = false;
          this.formSubmitted.emit();
          this.onClose();
        },
        error: (err) => {
          console.error('Error actualizando cliente completo:', err);
          console.error('Respuesta del backend:', err.error);

          alert('Error al actualizar cliente:\n\n' + JSON.stringify(err.error, null, 2));

          this.isSaving = false;
        },
      });

      return;
    }

    this.clientesService.createCliente(cliente).subscribe({
      next: (response) => {
        console.log('Cliente creado correctamente:', response);
        this.isSaving = false;
        this.formSubmitted.emit();
        this.onClose();
      },
      error: (err) => {
        console.error('Error creando cliente completo:', err);
        console.error('Respuesta del backend:', err.error);

        alert('Error al crear cliente:\n\n' + JSON.stringify(err.error, null, 2));

        this.isSaving = false;
      },
    });
  }

  prepararClienteParaEnviar(): CrearClienteRequest {
    const formValue = this.clienteForm.getRawValue();

    const cliente: CrearClienteRequest = {
      tipoIdentificacionId: Number(formValue.tipoIdentificacionId),

      identificacion: String(formValue.identificacion).trim(),

      nombres: String(formValue.nombres ?? '').trim(),
      apellidos: String(formValue.apellidos ?? '').trim(),
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

  get tipoIdentificacionId(): AbstractControl | null {
    return this.clienteForm.get('tipoIdentificacionId');
  }
}
