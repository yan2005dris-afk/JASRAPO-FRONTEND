import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ContractsService } from '../../services/contracts.service';
import { ICreateContractRequest } from '../../interfaces/icontract.interface';
import { ClientsComponent } from '../../../clients/clients';
import { TariffsComponent } from '../../../tariffs/tariffs';
import { MetersComponent } from '../../../meters/meters';
import { ComunidadesComponent } from '../../../../admin/comunidades/comunidades.component';
import { IClient } from '../../../clients/interfaces/iclients.interface';
import { IMeter } from '../../../meters/interfaces/imeter.interface';
import { ITariffCategory } from '../../../tariffs/interfaces/itariff.interface';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

/**
 * Página de registro de contrato cliente–medidor, organizada en secciones (tarjetas).
 * Reutiliza las pantallas de cliente y tarifa en modo selección, y el selector de medidor.
 */
@Component({
  selector: 'app-service-contract-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ClientsComponent,
    TariffsComponent,
    MetersComponent,
    ComunidadesComponent,
  ],
  templateUrl: './service-contract-form.component.html',
  styleUrl: './service-contract-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceContractFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contractsService = inject(ContractsService);
  private readonly toast = inject(ToastService);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  // Selecciones provenientes de los modales
  readonly selectedClient = signal<IClient | null>(null);
  readonly selectedMeter = signal<IMeter | null>(null);
  readonly selectedTariff = signal<ITariffCategory | null>(null);
  readonly selectedComunidad = signal<Comunidad | null>(null);

  // Estado de los modales hijos
  readonly isClientPickerOpen = signal(false);
  readonly isMeterPickerOpen = signal(false);
  readonly isTariffPickerOpen = signal(false);
  readonly isComunidadPickerOpen = signal(false);

  // Estado de envío
  readonly isSaving = signal(false);
  readonly submitted = signal(false);

  readonly form: FormGroup = this.fb.group({
    numeroGuia: ['', [Validators.required, Validators.maxLength(10)]],
    direccionSuministro: ['', [Validators.required, Validators.maxLength(50)]],
    lecturaInicial: ['0', [Validators.required, Validators.pattern(/^\d{1,10}$/)]],
  });

  // ---------- Selector de cliente ----------
  openClientPicker(): void {
    this.isClientPickerOpen.set(true);
  }

  closeClientPicker(): void {
    this.isClientPickerOpen.set(false);
  }

  onClientSelected(client: IClient): void {
    this.selectedClient.set(client);
    this.closeClientPicker();
  }

  // ---------- Selector de medidor ----------
  openMeterPicker(): void {
    this.isMeterPickerOpen.set(true);
  }

  closeMeterPicker(): void {
    this.isMeterPickerOpen.set(false);
  }

  onMeterSelected(meter: IMeter): void {
    this.selectedMeter.set(meter);
    this.closeMeterPicker();
  }

  // ---------- Selector de tarifa ----------
  openTariffPicker(): void {
    this.isTariffPickerOpen.set(true);
  }

  closeTariffPicker(): void {
    this.isTariffPickerOpen.set(false);
  }

  onTariffSelected(tariff: ITariffCategory): void {
    this.selectedTariff.set(tariff);
    this.closeTariffPicker();
  }

  // ---------- Selector de comunidad ----------
  openComunidadPicker(): void {
    this.isComunidadPickerOpen.set(true);
  }

  closeComunidadPicker(): void {
    this.isComunidadPickerOpen.set(false);
  }

  onComunidadSelected(comunidad: Comunidad): void {
    this.selectedComunidad.set(comunidad);
    this.closeComunidadPicker();
  }

  /** Acciones aún no definidas con el backend (registrar nuevo cliente/medidor, documentos). */
  comingSoon(): void {
    this.toast.info('Esta funcionalidad estará disponible próximamente.', 'En construcción');
  }

  // ---------- Helpers de presentación ----------
  getClientName(): string {
    const client = this.selectedClient();
    if (!client) {
      return '';
    }
    if (client.razonSocial) {
      return client.razonSocial;
    }
    return `${client.nombres ?? ''} ${client.apellidos ?? ''}`.trim();
  }

  getMeterStatusLabel(): string {
    return this.selectedMeter()?.estado?.nombre ?? '';
  }

  private getClientId(client: IClient): string | number | undefined {
    return client.clienteId ?? client.id ?? client.clientId ?? client._id;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched || this.submitted());
  }

  /** Permite solo dígitos en la lectura inicial (al escribir o pegar). */
  onLecturaInicialInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    if (input.value !== digits) {
      input.value = digits;
      this.form.get('lecturaInicial')?.setValue(digits);
    }
  }

  // ---------- Envío ----------
  save(): void {
    this.submitted.set(true);

    const client = this.selectedClient();
    const meter = this.selectedMeter();
    const tariff = this.selectedTariff();
    const comunidad = this.selectedComunidad();

    if (this.form.invalid || !client || !meter || !tariff || !comunidad) {
      this.form.markAllAsTouched();
      this.toast.warning(
        'Complete los datos y seleccione cliente, comunidad, medidor y tarifa.',
        'Datos incompletos',
      );
      return;
    }

    const value = this.form.value;
    const payload: ICreateContractRequest = {
      clienteId: String(this.getClientId(client)),
      categoriaTarifaId: String(tariff.categoriaTarifaId),
      medidorId: String(meter.medidorId),
      numeroGuia: value.numeroGuia,
      direccionSuministro: value.direccionSuministro,
      comunidadId: String(comunidad.id),
      lecturaInicial: Number(value.lecturaInicial),
    };

    this.isSaving.set(true);
    this.contractsService.createContract(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.success('Contrato registrado correctamente', 'Éxito');
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.message ?? 'No se pudo registrar el contrato.';
        this.toast.error(msg, 'Error');
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
