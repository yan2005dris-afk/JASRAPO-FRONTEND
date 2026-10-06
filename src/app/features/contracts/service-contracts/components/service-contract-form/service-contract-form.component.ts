import {
  afterNextRender,
  ElementRef,
  Injector,
  viewChild,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { ContractsApi } from '../../data/contracts.api';
import { IContract, IContractState } from '../../domain/models/service-contract.model';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { StepProgressComponent } from '../../../../../shared/components/step-progress/step-progress.component';
import { IClient } from '../../../clients/domain/models/client.model';
import { IMeter } from '../../../meters/domain/models/meter.model';
import { ITariffCategory } from '../../../tariffs/domain/models/tariff.model';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import type { ICoordinates } from '../../domain/models/service-area.model';

import { StepClientCommunityComponent } from './steps/step-client-community/step-client-community.component';
import { StepMeterTariffComponent } from './steps/step-meter-tariff/step-meter-tariff.component';
import { StepContractDetailsComponent } from './steps/step-contract-details/step-contract-details.component';
import { StepContractSummaryComponent } from './steps/step-contract-summary/step-contract-summary.component';
import { ContractPickerModalsComponent } from './modals/contract-picker-modals.component';
import { ContractLiveSummaryComponent } from './summary-sidebar/contract-live-summary.component';
import { ServiceContractFormStateService } from './services/service-contract-form-state.service';

/**
 * Formulario de contrato cliente–medidor. Sirve para CREAR y para EDITAR:
 * si se recibe `contractToEdit`, entra en modo edición (precarga los datos del contrato
 * y guarda con PATCH). Si no, está en modo creación (guarda con POST).
 */
@Component({
  selector: 'app-service-contract-form',
  imports: [
    ReactiveFormsModule,
    StepClientCommunityComponent,
    StepMeterTariffComponent,
    StepContractDetailsComponent,
    StepContractSummaryComponent,
    ContractPickerModalsComponent,
    ContractLiveSummaryComponent,
    StepProgressComponent,
  ],
  providers: [ServiceContractFormStateService],
  templateUrl: './service-contract-form.component.html',
  styleUrl: './service-contract-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceContractFormComponent implements OnInit {
  private readonly state = inject(ServiceContractFormStateService);
  private readonly contractsService = inject(ContractsApi);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly stepPanel = viewChild<ElementRef<HTMLElement>>('stepPanel');

  // Entradas y salidas del componente
  readonly contractToEdit = input<IContract | null>(null);
  readonly states = input<IContractState[]>([]);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  // Exposición delegada del estado y formulario
  readonly form = this.state.form;
  readonly steps = this.state.steps;
  readonly activeStep = this.state.activeStep;
  readonly stepAttempted = this.state.stepAttempted;
  readonly isEditing = this.state.isEditing;
  readonly isSuperAdmin = this.state.isSuperAdmin;
  readonly availableStates = this.state.availableStates;
  readonly selectedClient = this.state.selectedClient;
  readonly selectedMeter = this.state.selectedMeter;
  readonly selectedTariff = this.state.selectedTariff;
  readonly selectedComunidad = this.state.selectedComunidad;
  readonly isClientPickerOpen = this.state.isClientPickerOpen;
  readonly isMeterPickerOpen = this.state.isMeterPickerOpen;
  readonly isReplaceMeterModalOpen = this.state.isReplaceMeterModalOpen;
  readonly isTariffPickerOpen = this.state.isTariffPickerOpen;
  readonly isComunidadPickerOpen = this.state.isComunidadPickerOpen;
  readonly isSaving = this.state.isSaving;
  readonly submitted = this.state.submitted;
  readonly coordinates = this.state.coordinates;
  readonly serviceArea = this.state.serviceArea;
  readonly communityMapCenter = this.state.communityMapCenter;
  readonly previewNumeroGuia = this.state.previewNumeroGuia;

  ngOnInit(): void {
    this.state.init(this.contractToEdit(), this.states());
  }

  nextStep(): void {
    const advanced = this.state.nextStep();
    if (advanced) {
      this.focusStep();
    } else {
      this.focusStep();
    }
  }

  previousStep(): void {
    this.state.previousStep();
    this.focusStep();
  }

  goToStep(step: number): void {
    this.state.goToStep(step);
    this.focusStep();
  }

  isStepComplete(step: number): boolean {
    return this.state.isStepComplete(step);
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

  // Modales
  openClientPicker(): void {
    this.state.openClientPicker();
  }

  closeClientPicker(): void {
    this.state.closeClientPicker();
  }

  onClientSelected(client: IClient): void {
    this.state.onClientSelected(client);
  }

  openMeterPicker(): void {
    this.state.openMeterPicker();
  }

  closeMeterPicker(): void {
    this.state.closeMeterPicker();
  }

  onMeterSelected(meter: IMeter): void {
    this.state.onMeterSelected(meter);
  }

  openReplaceMeterModal(): void {
    this.state.openReplaceMeterModal();
  }

  closeReplaceMeterModal(): void {
    this.state.closeReplaceMeterModal();
  }

  onMeterReplaced(): void {
    this.state.onMeterReplaced().subscribe({
      next: () => {
        this.saved.emit();
      },
      error: () => {
        this.saved.emit();
      },
    });
  }

  openTariffPicker(): void {
    this.state.openTariffPicker();
  }

  closeTariffPicker(): void {
    this.state.closeTariffPicker();
  }

  onTariffSelected(tariff: ITariffCategory): void {
    this.state.onTariffSelected(tariff);
  }

  openComunidadPicker(): void {
    this.state.openComunidadPicker();
  }

  closeComunidadPicker(): void {
    this.state.closeComunidadPicker();
  }

  onComunidadSelected(comunidad: Comunidad): void {
    this.state.onComunidadSelected(comunidad);
  }

  onCoordinatesChange(value: ICoordinates): void {
    this.state.onCoordinatesChange(value);
  }

  coordinateError(): string | null {
    return this.state.coordinateError();
  }

  isFieldInvalid(field: string): boolean {
    return this.state.isFieldInvalid(field);
  }

  onLecturaInicialInput(event: Event): void {
    this.state.onLecturaInicialInput(event);
  }

  // Guardado
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

  private createContract(): void {
    const payload = this.state.buildCreatePayload();
    if (!payload) return;

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

  private updateContract(): void {
    const contract = this.contractToEdit();
    if (!contract) return;

    const payload = this.state.buildUpdatePayload();
    if (!payload) return;

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
