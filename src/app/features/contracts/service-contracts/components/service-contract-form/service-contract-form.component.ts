import {
  afterNextRender,
  ElementRef,
  Injector,
  viewChild,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ContractsApi } from '../../data/contracts.api';
import {
  IContract,
  IContractState,
  ICreateContractRequest,
  IUpdateContractRequest,
  getContractServiceState,
} from '../../domain/models/service-contract.model';
import { ClientsListComponent } from '../../../clients/pages/clients-list/clients-list.component';
import { TariffsListComponent } from '../../../tariffs/pages/tariffs-list/tariffs-list.component';
import { MetersIndexComponent } from '../../../meters/components/meters-index/meters-index.component';
import { ReplaceMeterModalComponent } from '../../../meters/components/replace-meter-modal/replace-meter-modal.component';
import { ComunidadesComponent } from '../../../../admin/comunidades/comunidades.component';
import { IClient } from '../../../clients/domain/models/client.model';
import { IMeter } from '../../../meters/domain/models/meter.model';
import { ITariffCategory } from '../../../tariffs/domain/models/tariff.model';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { CoordinateMapPickerComponent } from '../../../../../shared/components/coordinate-map-picker/coordinate-map-picker.component';
import type { ICoordinates, IPolygonGeometry } from '../../domain/models/service-area.model';
import { coordinatePairValidator } from '../../../../../shared/components/coordinate-map-picker/coordinate-pair.validator';
import { getCommunityMapCenter } from '../../domain/rules/community-map.rules';
import { AuthService } from '../../../../../core/services/auth.service';

/**
 * Formulario de contrato cliente–medidor. Sirve para CREAR y para EDITAR:
 * si se recibe `contractToEdit`, entra en modo edición (precarga los datos del contrato
 * y guarda con PATCH). Si no, está en modo creación (guarda con POST).
 */
@Component({
  selector: 'app-service-contract-form',
  imports: [
    ReactiveFormsModule,
    ClientsListComponent,
    TariffsListComponent,
    MetersIndexComponent,
    ReplaceMeterModalComponent,
    ComunidadesComponent,
    CoordinateMapPickerComponent,
  ],
  templateUrl: './service-contract-form.component.html',
  styleUrl: './service-contract-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceContractFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contractsService = inject(ContractsApi);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);

  // Si viene un contrato, el formulario está en modo edición. Catálogo de estados (para editar).
  readonly contractToEdit = input<IContract | null>(null);
  readonly states = input<IContractState[]>([]);

  readonly isSuperAdmin = computed(() => this.authService.isSuperAdmin());

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

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly injector = inject(Injector);
  private readonly stepPanel = viewChild<ElementRef<HTMLElement>>('stepPanel');
  readonly activeStep = signal(0);
  readonly stepAttempted = signal(false);
  readonly steps = [
    'Cliente y comunidad',
    'Medidor y tarifa',
    'Datos del contrato',
    'Resumen y confirmación',
  ];

  nextStep(): void {
    this.stepAttempted.set(true);
    if (!this.isStepComplete(this.activeStep())) {
      this.focusStep();
      return;
    }
    this.activeStep.update((step) => Math.min(step + 1, this.steps.length - 1));
    this.stepAttempted.set(false);
    this.focusStep();
  }

  previousStep(): void {
    this.activeStep.update((step) => Math.max(0, step - 1));
    this.stepAttempted.set(false);
    this.focusStep();
  }

  goToStep(step: number): void {
    if (step < 0 || step >= this.steps.length) return;
    this.activeStep.set(step);
    this.stepAttempted.set(false);
    this.focusStep();
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

  private focusStep(): void {
    afterNextRender(
      () => {
        const panel = this.stepPanel()?.nativeElement;
        const target =
          panel?.querySelector<HTMLElement>(
            'input.ng-invalid, select.ng-invalid, textarea.ng-invalid',
          ) ??
          panel?.querySelector<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
          );
        (target ?? panel)?.focus();
      },
      { injector: this.injector },
    );
  }

  readonly isEditing = computed(() => !!this.contractToEdit());

  // Selecciones provenientes de los modales
  readonly selectedClient = signal<IClient | null>(null);
  readonly selectedMeter = signal<IMeter | null>(null);
  readonly selectedTariff = signal<ITariffCategory | null>(null);
  readonly selectedComunidad = signal<Comunidad | null>(null);

  // Estado de los modales hijos
  readonly isClientPickerOpen = signal(false);
  readonly isMeterPickerOpen = signal(false);
  readonly isReplaceMeterModalOpen = signal(false);
  readonly isTariffPickerOpen = signal(false);
  readonly isComunidadPickerOpen = signal(false);

  // Estado de envío
  readonly isSaving = signal(false);
  readonly submitted = signal(false);

  // Medidor original (para detectar si se reemplazó al editar)
  private originalMeterId: string | null = null;

  readonly coordinates = signal<ICoordinates>({ latitud: null, longitud: null });
  readonly serviceArea = signal<IPolygonGeometry | null>(null);
  readonly communityMapCenter = computed(() =>
    getCommunityMapCenter(this.selectedComunidad()?.nombre),
  );

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

  ngOnInit(): void {
    if (!this.isSuperAdmin()) {
      this.form.get('lecturaInicial')?.disable();
    }

    const contract = this.contractToEdit();
    if (contract) {
      this.preloadContract(contract);
    }
    this.loadServiceArea();
  }

  private loadServiceArea(): void {
    this.contractsService.getServiceArea().subscribe({
      next: (area) => this.serviceArea.set(area.geometria),
      error: () => this.serviceArea.set(null),
    });
  }

  /** Precarga en el formulario los datos del contrato a editar. */
  private preloadContract(contract: IContract): void {
    const latitud = contract.latitud ?? null;
    const longitud = contract.longitud ?? null;

    this.form.patchValue({
      direccionSuministro: contract.direccionSuministro,
      estadoServicio: getContractServiceState(contract),
      latitud,
      longitud,
    });
    this.coordinates.set({ latitud, longitud });

    // Cliente, tarifa y comunidad (vienen anidados en el contrato)
    this.selectedClient.set(contract.cliente as unknown as IClient);
    this.selectedTariff.set(contract.categoriaTarifa as ITariffCategory);
    this.selectedComunidad.set({
      id: contract.comunidad.comunidadId,
      nombre: contract.comunidad.nombre,
      codigo: contract.comunidad.codigo,
      porcentajeTasaSeguridad: 0,
    });

    // Medidor vigente (el del historial sin fecha de fin)
    const historial =
      contract.historialMedidores?.find((h) => h.fechaHasta === null) ||
      contract.historialMedidores?.[0];
    if (historial) {
      this.selectedMeter.set(historial.medidor as unknown as IMeter);
      this.originalMeterId = String(historial.medidorId);
      if (historial.lecturaInicial !== undefined && historial.lecturaInicial !== null) {
        this.form.patchValue({
          lecturaInicial: String(historial.lecturaInicial),
        });
      }
    }
  }

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

  // ---------- Reemplazo de medidor (flujo dedicado para contratos existentes) ----------
  openReplaceMeterModal(): void {
    this.isReplaceMeterModalOpen.set(true);
  }

  closeReplaceMeterModal(): void {
    this.isReplaceMeterModalOpen.set(false);
  }

  onMeterReplaced(): void {
    this.closeReplaceMeterModal();
    this.toast.success('Medidor reemplazado correctamente', 'Éxito');
    const contract = this.contractToEdit();
    if (contract) {
      this.contractsService.getContractById(contract.contratoId).subscribe({
        next: (refreshedContract) => {
          this.preloadContract(refreshedContract);
          this.saved.emit();
        },
        error: () => {
          this.saved.emit();
        },
      });
    } else {
      this.saved.emit();
    }
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

  // ---------- Ubicación del predio ----------
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

  /** Acciones aún no definidas con el backend (registrar nuevo cliente/medidor, documentos). */
  comingSoon(): void {
    this.toast.info('Esta funcionalidad estará disponible próximamente.', 'En construcción');
  }

  // ---------- Estado derivado para presentación (computed) ----------
  readonly clientName = computed(() => {
    const client = this.selectedClient();
    if (!client) {
      return '';
    }
    if (client.razonSocial) {
      return client.razonSocial;
    }
    return `${client.nombres ?? ''} ${client.apellidos ?? ''}`.trim();
  });

  readonly meterStatusLabel = computed(() => this.selectedMeter()?.estado?.nombre ?? '');

  readonly meterInstalacionLabel = computed(() => {
    const fecha = this.selectedMeter()?.fechaInstalacion;
    if (!fecha) {
      return '—';
    }
    const d = new Date(fecha);
    return Number.isNaN(d.getTime()) ? fecha : d.toLocaleDateString('es-EC');
  });

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
    if (this.isSaving()) return;
    if (!this.isEditing() && this.activeStep() < this.steps.length - 1) {
      this.nextStep();
      return;
    }
    if (!this.isEditing()) {
      const incomplete = [0, 1, 2].find((step) => !this.isStepComplete(step));
      if (incomplete !== undefined) {
        this.submitted.set(true);
        this.toast.warning('Complete los datos requeridos del registro.', 'Datos incompletos');
        this.activeStep.set(incomplete);
        this.stepAttempted.set(true);
        this.form.markAllAsTouched();
        this.focusStep();
        return;
      }
    }
    if (this.isEditing()) {
      this.updateContract();
    } else {
      this.createContract();
    }
  }

  /** Crea un nuevo contrato (POST). */
  private createContract(): void {
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

    // Valida que el cliente tenga un id real antes de armar el payload
    // (evita enviar el texto "undefined" al backend).
    const clientId = this.getClientId(client);
    if (clientId == null) {
      this.toast.warning(
        'El cliente seleccionado no tiene un identificador válido.',
        'Datos incompletos',
      );
      return;
    }

    const value = this.form.getRawValue();
    // Solo Super Admin puede definir lecturaInicial; para otros roles se omite (backend usará default 0)
    const payload: ICreateContractRequest = {
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

    this.isSaving.set(true);
    this.contractsService.createContract(payload).subscribe({
      next: (createdContract) => {
        this.isSaving.set(false);
        this.toast.success(
          `Contrato registrado. N° de guía: ${createdContract.numeroGuia}`,
          'Éxito',
        );
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.message ?? 'No se pudo registrar el contrato.';
        this.toast.error(msg, 'Error');
      },
    });
  }

  /** Actualiza un contrato existente (PATCH). Actualiza únicamente datos contractuales. */
  private updateContract(): void {
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
      return;
    }

    // Valida que el cliente tenga un id real antes de armar el payload
    // (evita enviar el texto "undefined" al backend).
    const clientId = this.getClientId(client);
    if (clientId == null) {
      this.toast.warning(
        'El cliente seleccionado no tiene un identificador válido.',
        'Datos incompletos',
      );
      return;
    }

    const value = this.form.value;
    // Solo se actualizan datos contractuales. El medidor se gestiona por POST /meters/replace.
    const payload: IUpdateContractRequest = {
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

    this.isSaving.set(true);
    this.contractsService.updateContract(contract.contratoId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.success('Contrato actualizado correctamente', 'Éxito');
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.message ?? 'No se pudo actualizar el contrato.';
        this.toast.error(msg, 'Error');
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
