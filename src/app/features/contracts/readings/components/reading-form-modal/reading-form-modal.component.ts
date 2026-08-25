import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingsService } from '../../services/readings.service';
import {
  ICreateReadingDto,
  IReading,
  IUpdateReadingDto,
} from '../../interfaces/ireading.interface';
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';
import { PeriodPickerComponent } from '../../../../../shared/components/period-picker/period-picker.component';
import type { IAccountingPeriod } from '../../../../../shared/services/periods.service';
import { PickerInputComponent } from '../../../../../shared/components/picker-input/picker-input.component';
import { ContractsService } from '../../../service-contracts/services/contracts.service';
import type {
  IContract,
  IHistorialMedidor,
  IMedidorResumen,
} from '../../../service-contracts/interfaces/icontract.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-reading-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerComponent,
    PeriodPickerComponent,
    PickerInputComponent,
  ],
  templateUrl: './reading-form-modal.component.html',
  styleUrl: './reading-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'close()',
  },
})
export class ReadingFormModalComponent implements OnInit {
  private readonly readingsService = inject(ReadingsService);
  private readonly contractsService = inject(ContractsService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly reading = input<IReading | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  // Contract Autocomplete Search
  contractSearchQuery = '';
  contractSearchResults: IContract[] = [];
  isSearchingContracts = false;
  isContractAutocompleteOpen = false;
  selectedContract: IContract | null = null;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  medidorId = '';
  fecha = '';
  lecturaAnterior = 0;
  lecturaActual = 0;
  lecturaInicial = false;
  periodoId: number | null = null;
  descripcionAnomalia = '';

  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  isLoading = false;

  ngOnInit(): void {
    const r = this.reading();
    if (r) {
      this.medidorId = String(r.medidor?.medidorId || '');
      this.fecha =
        typeof r.fecha === 'string'
          ? r.fecha.split('T')[0]
          : new Date(r.fecha).toISOString().split('T')[0];
      this.lecturaAnterior = Number(r.lecturaAnterior);
      this.lecturaActual = Number(r.lecturaActual);
      this.lecturaInicial = r.lecturaInicial;
      this.periodoId = r.periodoId || null;
      this.descripcionAnomalia = r.descripcionAnomalia || '';
      this.imagePreviewUrl = r.fotoUrl || null;
      if (r.contrato) {
        this.contractSearchQuery =
          `${r.contrato.numeroGuia || ''} - Contrato #${r.contrato.contratoId}`.trim();
      }
    } else {
      this.fecha = new Date().toISOString().split('T')[0];
    }
  }

  formatClientName(cliente: IContract['cliente']): string {
    if (cliente.razonSocial) {
      return cliente.razonSocial;
    }
    return `${cliente.nombres} ${cliente.apellidos}`.trim();
  }

  onContractSearchInput(query: string): void {
    this.contractSearchQuery = query;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      this.contractSearchResults = [];
      this.isContractAutocompleteOpen = false;
      this.cdr.markForCheck();
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.executeContractSearch(trimmed);
    }, 350);
  }

  private executeContractSearch(term: string): void {
    this.isSearchingContracts = true;
    this.isContractAutocompleteOpen = true;
    this.cdr.markForCheck();

    this.contractsService.getContracts({ search: term, limit: 8 }).subscribe({
      next: (res) => {
        this.contractSearchResults = res.data;
        this.isSearchingContracts = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.contractSearchResults = [];
        this.isSearchingContracts = false;
        this.cdr.markForCheck();
      },
    });
  }

  getActiveMeter(contract: IContract): IMedidorResumen | undefined {
    if (!contract.historialMedidores || contract.historialMedidores.length === 0) return undefined;
    const active = contract.historialMedidores.find((h) => !h.fechaHasta);
    return active?.medidor || contract.historialMedidores[0]?.medidor;
  }

  getActiveHistorial(contract: IContract): IHistorialMedidor | undefined {
    if (!contract.historialMedidores || contract.historialMedidores.length === 0) return undefined;
    return contract.historialMedidores.find((h) => !h.fechaHasta) || contract.historialMedidores[0];
  }

  selectContract(contract: IContract): void {
    this.selectedContract = contract;
    const activeMeter = this.getActiveMeter(contract);
    const activeHistorial = this.getActiveHistorial(contract);
    this.medidorId = activeMeter?.medidorId ? String(activeMeter.medidorId) : '';
    this.contractSearchQuery = `${contract.numeroGuia} - ${this.formatClientName(contract.cliente)}`;
    this.isContractAutocompleteOpen = false;
    this.contractSearchResults = [];

    // Cargar automáticamente la última lectura registrada para autocompletar la lectura anterior
    if (!this.reading()) {
      this.readingsService
        .getReadings({ contratoId: contract.contratoId, page: 1, limit: 1 })
        .subscribe({
          next: (res) => {
            if (res.data && res.data.length > 0) {
              const ultimaLectura = res.data[0];
              // La lectura anterior es la lectura actual del mes previo
              this.lecturaAnterior = Number(
                ultimaLectura.lecturaActual || ultimaLectura.lecturaAnterior || 0,
              );
              this.lecturaInicial = false;
            } else {
              // Si no hay lecturas previas registradas: autocompletar lecturaAnterior desde historialMedidores[activo].lecturaInicial
              const initialFromHistory = Number(activeHistorial?.lecturaInicial ?? 0);
              this.lecturaAnterior = initialFromHistory;
              this.lecturaInicial = true;
            }
            this.cdr.markForCheck();
          },
          error: () => {
            const initialFromHistory = Number(activeHistorial?.lecturaInicial ?? 0);
            this.lecturaAnterior = initialFromHistory;
            this.lecturaInicial = true;
            this.cdr.markForCheck();
          },
        });
    }

    this.cdr.markForCheck();
  }

  clearSelectedContract(): void {
    this.selectedContract = null;
    this.contractSearchQuery = '';
    this.contractSearchResults = [];
    this.isContractAutocompleteOpen = false;
    this.medidorId = '';
    if (!this.reading()) {
      this.lecturaAnterior = 0;
      this.lecturaInicial = false;
    }
    this.cdr.markForCheck();
  }

  onPeriodSelectedFromPicker(period: IAccountingPeriod | null): void {
    this.periodoId = period?.periodoId ?? null;
    this.cdr.markForCheck();
  }

  get calculatedConsumo(): number {
    return Math.max(0, Number(this.lecturaActual || 0) - Number(this.lecturaAnterior || 0));
  }

  get isFormValid(): boolean {
    if (!this.medidorId && !this.reading()) return false;
    if (!this.fecha) return false;
    if (this.lecturaActual < 0 || this.lecturaAnterior < 0) return false;
    return true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.cdr.markForCheck();
  }

  submit(): void {
    if (!this.isFormValid || this.isLoading) return;

    this.isLoading = true;
    const isEdit = !!this.reading();

    if (isEdit) {
      const currentStatus = this.reading()?.estado;
      const newStatus =
        currentStatus === 'PENDIENTE' && Number(this.lecturaActual) > 0
          ? 'POR_REVISION'
          : currentStatus;

      const updateDto: IUpdateReadingDto = {
        fecha: this.fecha,
        lecturaAnterior: Number(this.lecturaAnterior),
        lecturaActual: Number(this.lecturaActual),
        consumoCalculado: this.calculatedConsumo,
        descripcionAnomalia: this.descripcionAnomalia.trim() || undefined,
        lecturaInicial: this.lecturaInicial,
        periodoId: Number(this.periodoId),
        estado: newStatus,
      };

      this.readingsService
        .updateReading(this.reading()!.lecturaId, updateDto, this.selectedFile || undefined)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.show('Lectura actualizada exitosamente', 'success');
            this.saved.emit();
          },
          error: (err) => {
            this.isLoading = false;
            const msg = err?.error?.message || 'Error al actualizar lectura';
            this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
            this.cdr.markForCheck();
          },
        });
    } else {
      const createDto: ICreateReadingDto = {
        medidorId: this.medidorId,
        fecha: this.fecha,
        lecturaAnterior: Number(this.lecturaAnterior),
        lecturaActual: Number(this.lecturaActual),
        consumoCalculado: this.calculatedConsumo,
        descripcionAnomalia: this.descripcionAnomalia.trim() || undefined,
        lecturaInicial: this.lecturaInicial,
        periodoId: Number(this.periodoId),
      };

      this.readingsService.createReading(createDto, this.selectedFile || undefined).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Lectura registrada exitosamente', 'success');
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al registrar lectura';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
          this.cdr.markForCheck();
        },
      });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
