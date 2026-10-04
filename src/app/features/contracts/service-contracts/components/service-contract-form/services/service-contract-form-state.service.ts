import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of, tap } from 'rxjs';

import { ContractsApi } from '../../../data/contracts.api';
import {
  IContract,
  IContractState,
  ICreateContractRequest,
  IUpdateContractRequest,
  getContractServiceState,
} from '../../../domain/models/service-contract.model';
import { IClient } from '../../../../clients/domain/models/client.model';
import { IMeter } from '../../../../meters/domain/models/meter.model';
import { ITariffCategory } from '../../../../tariffs/domain/models/tariff.model';
import { Comunidad } from '../../../../../admin/comunidades/models/comunidad.interface';
import { ToastService } from '../../../../../../shared/components/toast/toast.service';
import type { ICoordinates, IPolygonGeometry } from '../../../domain/models/service-area.model';
import { coordinatePairValidator } from '../../../../../../shared/components/coordinate-map-picker/coordinate-pair.validator';
import { getCommunityMapCenter } from '../../../domain/rules/community-map.rules';
import { AuthService } from '../../../../../../core/services/auth.service';

@Injectable()
export class ServiceContractFormStateService {
  private readonly fb = inject(FormBuilder);
  private readonly contractsService = inject(ContractsApi);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);

  readonly steps = [
    'Cliente y comunidad',
    'Medidor y tarifa',
    'Datos del contrato',
    'Resumen y confirmación',
  ];

  // Configuración de entrada
  readonly contractToEdit = signal<IContract | null>(null);
  readonly states = signal<IContractState[]>([]);

  readonly isSuperAdmin = computed(() => this.authService.isSuperAdmin());
  readonly isEditing = computed(() => !!this.contractToEdit());

  readonly availableStates = computed(() => {
    const contract = this.contractToEdit();
    const current = contract ? getContractServiceState(contract) : '';
    const managed = [
      'PENDIENTE_INSPECCION',
      'PENDIENTE_PAGO',
      'PENDIENTE_INSTALACION',
      'RECHAZADO',
    ];
    return this.states().filter((state) =>
      managed.includes(current) ? state.codigo === current : !managed.includes(state.codigo),
    );
  });

  // Pasos del formulario
  readonly activeStep = signal(0);
  readonly stepAttempted = signal(false);

  // Selecciones del contrato
  readonly selectedClient = signal<IClient | null>(null);
  readonly selectedMeter = signal<IMeter | null>(null);
  readonly selectedTariff = signal<ITariffCategory | null>(null);
  readonly selectedComunidad = signal<Comunidad | null>(null);

  // Control de modales
  readonly isClientPickerOpen = signal(false);
  readonly isMeterPickerOpen = signal(false);
  readonly isReplaceMeterModalOpen = signal(false);
  readonly isTariffPickerOpen = signal(false);
  readonly isComunidadPickerOpen = signal(false);

  // Estado de envío
  readonly isSaving = signal(false);
  readonly submitted = signal(false);

  readonly coordinates = signal<ICoordinates>({ latitud: null, longitud: null });
  readonly serviceArea = signal<IPolygonGeometry | null>(null);
  readonly communityMapCenter = computed(() =>
    getCommunityMapCenter(this.selectedComunidad()?.nombre),
  );

  readonly previewNumeroGuia = computed(() => {
    if (this.isEditing()) {
      return this.contractToEdit()?.numeroGuia || 'Se asignará al guardar';
    }
    const com = this.selectedComunidad();
    const meter = this.selectedMeter();
    const codComunidad = com?.codigo
      ? com.codigo
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-]/g, '')
          .toUpperCase()
      : 'COMUNIDAD';
    const serie = meter?.serie
      ? meter.serie
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-]/g, '')
          .toUpperCase()
      : 'MEDIDOR';

    if (!com && !meter) {
      return '[SERIE_MEDIDOR]-[COMUNIDAD]-XXXXXX (secuencial al guardar)';
    }
    return `${serie}-${codComunidad}-XXXXXX (secuencial al guardar)`;
  });

  readonly form: FormGroup = this.fb.group(
    {
      direccionSuministro: ['', [Validators.required, Validators.maxLength(200)]],
      lecturaInicial: ['0', [Validators.required, Validators.pattern(/^\d{1,10}$/)]],
      estadoServicio: [''],
      latitud: [null as number | null, [Validators.min(-90), Validators.max(90)]],
      longitud: [null as number | null, [Validators.min(-180), Validators.max(180)]],
    },
    { validators: coordinatePairValidator },
  );

  init(contract: IContract | null, statesCatalog: IContractState[] = []): void {
    this.contractToEdit.set(contract);
    this.states.set(statesCatalog);

    if (!this.isSuperAdmin()) {
      this.form.get('lecturaInicial')?.disable();
    }

    if (contract) {
      this.preloadContract(contract);
    }
    this.loadServiceArea();
  }

  loadServiceArea(): void {
    this.contractsService.getServiceArea().subscribe({
      next: (area) => this.serviceArea.set(area.geometria),
      error: () => this.serviceArea.set(null),
    });
  }

  preloadContract(contract: IContract): void {
    const latitud = contract.latitud ?? null;
    const longitud = contract.longitud ?? null;

    this.form.patchValue({
      direccionSuministro: contract.direccionSuministro,
      estadoServicio: getContractServiceState(contract),
      latitud,
      longitud,
    });
    this.coordinates.set({ latitud, longitud });

    this.selectedClient.set(contract.cliente as unknown as IClient);
    this.selectedTariff.set(contract.categoriaTarifa as ITariffCategory);
    this.selectedComunidad.set({
      id: contract.comunidad.comunidadId,
      nombre: contract.comunidad.nombre,
      codigo: contract.comunidad.codigo,
      porcentajeTasaSeguridad: 0,
    });

    const historial =
      contract.historialMedidores?.find((h) => h.fechaHasta === null) ||
      contract.historialMedidores?.[0];
    if (historial) {
      this.selectedMeter.set(historial.medidor as unknown as IMeter);
      if (historial.lecturaInicial !== undefined && historial.lecturaInicial !== null) {
        this.form.patchValue({
          lecturaInicial: String(historial.lecturaInicial),
        });
      }
    }
  }

  isStepComplete(step: number): boolean {
    if (step === 0)
      return (
        !!this.selectedClient() &&
        this.getClientId(this.selectedClient()!) != null &&
        !!this.selectedComunidad()
      );
    if (step === 1) return !!this.selectedMeter() && !!this.selectedTariff();
    if (step === 2) return this.form.valid && !this.coordinateError();
    return true;
  }

  nextStep(): boolean {
    this.stepAttempted.set(true);
    if (!this.isStepComplete(this.activeStep())) {
      return false;
    }
    this.activeStep.update((step) => Math.min(step + 1, this.steps.length - 1));
    this.stepAttempted.set(false);
    return true;
  }

  previousStep(): void {
    this.activeStep.update((step) => Math.max(0, step - 1));
    this.stepAttempted.set(false);
  }

  goToStep(step: number): void {
    if (step < 0 || step >= this.steps.length) return;
    this.activeStep.set(step);
    this.stepAttempted.set(false);
  }

  // Modales
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

  openReplaceMeterModal(): void {
    this.isReplaceMeterModalOpen.set(true);
  }

  closeReplaceMeterModal(): void {
    this.isReplaceMeterModalOpen.set(false);
  }

  onMeterReplaced(): Observable<IContract | void> {
    this.closeReplaceMeterModal();
    this.toast.success('Medidor reemplazado correctamente', 'Éxito');
    const contract = this.contractToEdit();
    if (contract) {
      return this.contractsService.getContractById(contract.contratoId).pipe(
        tap({
          next: (refreshedContract) => {
            this.preloadContract(refreshedContract);
          },
        }),
      );
    }
    return of(undefined);
  }

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

  onCoordinatesChange(value: ICoordinates): void {
    this.form.patchValue({ latitud: value.latitud, longitud: value.longitud });
    this.form.markAsDirty();
    this.coordinates.set(value);
  }

  coordinateError(): string | null {
    const latControl = this.form.get('latitud');
    const lngControl = this.form.get('longitud');
    const isRelevant =
      latControl?.dirty ||
      latControl?.touched ||
      lngControl?.dirty ||
      lngControl?.touched ||
      this.submitted();

    if (!isRelevant) {
      return null;
    }
    if (this.form.hasError('coordinatePair')) {
      return 'Ingrese latitud y longitud, o deje ambas vacías.';
    }
    if (latControl?.hasError('min') || latControl?.hasError('max')) {
      return 'La latitud debe estar entre -90 y 90.';
    }
    if (lngControl?.hasError('min') || lngControl?.hasError('max')) {
      return 'La longitud debe estar entre -180 y 180.';
    }
    return null;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched || this.submitted());
  }

  onLecturaInicialInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    if (input.value !== digits) {
      input.value = digits;
      this.form.get('lecturaInicial')?.setValue(digits);
    }
  }

  getClientId(client: IClient): string | number | undefined {
    return client.clienteId ?? client.id ?? client.clientId ?? client._id;
  }

  buildCreatePayload(): ICreateContractRequest | null {
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
      return null;
    }

    const clientId = this.getClientId(client);
    if (clientId == null) {
      this.toast.warning(
        'El cliente seleccionado no tiene un identificador válido.',
        'Datos incompletos',
      );
      return null;
    }

    const value = this.form.getRawValue();
    return {
      clienteId: String(clientId),
      categoriaTarifaId: String(tariff.categoriaTarifaId),
      medidorId: String(meter.medidorId),
      direccionSuministro: value.direccionSuministro,
      comunidadId: String(comunidad.id),
      ...(this.isSuperAdmin() && value.lecturaInicial !== undefined && value.lecturaInicial !== ''
        ? { lecturaInicial: Number(value.lecturaInicial) }
        : {}),
      ...(value.latitud != null && value.longitud != null
        ? { latitud: value.latitud, longitud: value.longitud }
        : {}),
    };
  }

  buildUpdatePayload(): IUpdateContractRequest | null {
    this.submitted.set(true);

    const contract = this.contractToEdit();
    const client = this.selectedClient();
    const tariff = this.selectedTariff();
    const comunidad = this.selectedComunidad();

    if (!contract || this.form.invalid || !client || !tariff || !comunidad) {
      this.form.markAllAsTouched();
      this.toast.warning(
        'Complete los datos y seleccione cliente, comunidad y tarifa.',
        'Datos incompletos',
      );
      return null;
    }

    const clientId = this.getClientId(client);
    if (clientId == null) {
      this.toast.warning(
        'El cliente seleccionado no tiene un identificador válido.',
        'Datos incompletos',
      );
      return null;
    }

    const value = this.form.value;
    return {
      ...(value.estadoServicio && value.estadoServicio !== getContractServiceState(contract)
        ? { estadoServicio: value.estadoServicio }
        : {}),
      direccionSuministro: value.direccionSuministro,
      clienteId: String(clientId),
      comunidadId: String(comunidad.id),
      categoriaTarifaId: String(tariff.categoriaTarifaId),
      latitud: value.latitud ?? null,
      longitud: value.longitud ?? null,
    };
  }
}
