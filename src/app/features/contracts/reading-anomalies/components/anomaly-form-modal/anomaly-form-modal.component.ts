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
import { ReadingAnomaliesService } from '../../services/reading-anomalies.service';
import {
  ICreateReadingAnomalyDto,
  IReadingAnomaly,
  IUpdateReadingAnomalyDto,
  TipoAnomalia,
} from '../../interfaces/ianomaly.interface';
import { ContractsService } from '../../../service-contracts/services/contracts.service';
import type { IContract } from '../../../service-contracts/domain/models/service-contract.model';
import { ReadingsService } from '../../../readings/services/readings.service';
import type { IReading } from '../../../readings/interfaces/ireading.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { LocalDatePipe } from '../../../../../shared/pipes/local-date.pipe';

@Component({
  selector: 'app-anomaly-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LocalDatePipe],
  templateUrl: './anomaly-form-modal.component.html',
  styleUrl: './anomaly-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnomalyFormModalComponent implements OnInit {
  private readonly anomaliesService = inject(ReadingAnomaliesService);
  private readonly contractsService = inject(ContractsService);
  private readonly readingsService = inject(ReadingsService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly anomaly = input<IReadingAnomaly | null>(null);
  readonly initialLecturaId = input<string | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  // Contract Autocomplete Search
  contractSearchQuery = '';
  contractSearchResults: IContract[] = [];
  isSearchingContracts = false;
  isContractAutocompleteOpen = false;
  selectedContract: IContract | null = null;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Readings for selected contract
  contractReadings: IReading[] = [];
  isLoadingContractReadings = false;

  lecturaId = '';
  tipo: TipoAnomalia = 'FUGA';
  observacion = '';

  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  isLoading = false;

  readonly tipoOptions: { value: TipoAnomalia; label: string }[] = [
    { value: 'FUGA', label: 'Fuga de Agua' },
    { value: 'MEDIDOR_DAÑADO', label: 'Medidor Dañado / Inoperativo' },
    { value: 'LECTURA_ERRONEA', label: 'Lectura Errónea / Incongruente' },
    { value: 'OTRO', label: 'Otro Incidente' },
  ];

  ngOnInit(): void {
    const a = this.anomaly();
    if (a) {
      this.lecturaId = a.lecturaId ? String(a.lecturaId) : '';
      this.tipo = a.tipo as TipoAnomalia;
      this.observacion = a.observacion || '';
      this.imagePreviewUrl = a.fotoUrl || null;
      if (a.lectura) {
        this.contractSearchQuery = `Lectura #${a.lecturaId}`;
      }
    } else if (this.initialLecturaId()) {
      this.lecturaId = this.initialLecturaId()!;
      this.readingsService.getReadingById(this.initialLecturaId()!).subscribe({
        next: (reading) => {
          if (reading?.contrato) {
            this.contractSearchQuery = `${reading.contrato.numeroGuia} - Lectura #${reading.lecturaId}`;
          }
          this.cdr.markForCheck();
        },
      });
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

  selectContract(contract: IContract): void {
    this.selectedContract = contract;
    this.contractSearchQuery = `${contract.numeroGuia} - ${this.formatClientName(contract.cliente)}`;
    this.isContractAutocompleteOpen = false;
    this.contractSearchResults = [];
    this.loadContractReadings(contract.contratoId);
  }

  clearSelectedContract(): void {
    this.selectedContract = null;
    this.contractSearchQuery = '';
    this.contractSearchResults = [];
    this.isContractAutocompleteOpen = false;
    this.contractReadings = [];
    this.lecturaId = '';
    this.cdr.markForCheck();
  }

  loadContractReadings(contratoId: string): void {
    this.isLoadingContractReadings = true;
    this.readingsService.getReadings({ contratoId, page: 1, limit: 10 }).subscribe({
      next: (res) => {
        this.contractReadings = res.data || [];
        this.isLoadingContractReadings = false;
        if (this.contractReadings.length > 0 && !this.lecturaId) {
          this.lecturaId = String(this.contractReadings[0].lecturaId);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.contractReadings = [];
        this.isLoadingContractReadings = false;
        this.cdr.markForCheck();
      },
    });
  }

  get isFormValid(): boolean {
    return !!this.lecturaId.trim() && !!this.tipo;
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
    const isEdit = !!this.anomaly();

    if (isEdit) {
      const updateDto: IUpdateReadingAnomalyDto = {
        tipo: this.tipo,
        observacion: this.observacion.trim() || undefined,
      };

      this.anomaliesService
        .updateAnomaly(this.anomaly()!.anomaliaId, updateDto, this.selectedFile || undefined)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastService.show('Anomalía actualizada exitosamente', 'success');
            this.saved.emit();
          },
          error: (err) => {
            this.isLoading = false;
            const msg = err?.error?.message || 'Error al actualizar anomalía';
            this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
            this.cdr.markForCheck();
          },
        });
    } else {
      const createDto: ICreateReadingAnomalyDto = {
        lecturaId: this.lecturaId.trim(),
        tipo: this.tipo,
        estado: 'PENDIENTE',
        observacion: this.observacion.trim() || undefined,
      };

      this.anomaliesService.createAnomaly(createDto, this.selectedFile || undefined).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Anomalía reportada exitosamente', 'success');
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al reportar anomalía';
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
