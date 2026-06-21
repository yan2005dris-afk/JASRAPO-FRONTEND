import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MetersService } from '../../contracts/meters/services/meters.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorService } from '../service/operator.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IMeterDto } from '../../contracts/meters/interfaces/imeter.interface';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import type { ReadingWithAnomaly } from '../models/operator.models';

@Component({
  selector: 'app-operator-novelties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './novedades.component.html',
  styleUrl: './novedades.component.scss',
})
export class NovedadesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly metersService = inject(MetersService);
  private readonly dbService = inject(IndexedDbService);
  private readonly operatorService = inject(OperatorService);
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);
  private readonly toastService = inject(ToastService);

  // ---- Pending anomalies from backend (new) ----
  readonly pendingAnomalies = signal<ReadingWithAnomaly[]>([]);
  readonly isLoadingAnomalies = signal<boolean>(false);
  readonly offlineMode = signal<boolean>(false);
  readonly reportSectionExpanded = signal<boolean>(false);

  // ---- Report form (existing, kept as secondary action) ----
  readonly metersList = signal<IMeterDto[]>([]);
  readonly searchQuery = signal<string>('');
  readonly selectedMeter = signal<IMeterDto | null>(null);
  readonly isLoadingMeters = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  readonly tiposAnomalia = [
    { value: 'FUGA', label: 'Fuga de Agua' },
    { value: 'MEDIDOR_DAÑADO', label: 'Medidor Dañado / Roto' },
    { value: 'LECTURA_ERRONEA', label: 'Lectura Errónea' },
    { value: 'OTRO', label: 'Otro Problema' },
  ];

  photoPreview = signal<string | null>(null);
  noveltyForm!: FormGroup;

  readonly filteredMeters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.metersList();
    if (!query) return list;
    return list.filter(
      (m) =>
        m.serie.toLowerCase().includes(query) ||
        (m.contratoId && m.contratoId.toString().toLowerCase().includes(query)) ||
        (m.clienteNombre && m.clienteNombre.toLowerCase().includes(query)),
    );
  });

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  private loadInitialData(): void {
    if (this.networkService.isOnline()) {
      this.offlineMode.set(false);
      this.loadPendingAnomalies();
    } else {
      this.offlineMode.set(true);
    }

    // Always load cached meters for the report form (secondary action)
    this.loadCachedMeters().then(() => {
      const medidorId = this.route.snapshot.queryParamMap.get('medidorId');
      if (medidorId) {
        const meter = this.metersList().find((m) => m.medidorId.toString() === medidorId);
        if (meter) {
          this.selectMeter(meter);
          // Pre-expand the report section if coming from another flow
          this.reportSectionExpanded.set(true);
        }
      }
    });
  }

  private loadPendingAnomalies(): void {
    this.isLoadingAnomalies.set(true);
    this.operatorService.getReadingsWithAnomalies().subscribe({
      next: (anomalies) => {
        this.pendingAnomalies.set(anomalies);
        this.isLoadingAnomalies.set(false);
      },
      error: () => {
        this.isLoadingAnomalies.set(false);
      },
    });
  }

  toggleReportSection(): void {
    this.reportSectionExpanded.set(!this.reportSectionExpanded());
  }

  private initForm(): void {
    this.noveltyForm = this.fb.group({
      tipo: ['', Validators.required],
      observacion: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  private async loadCachedMeters(): Promise<void> {
    try {
      const cached = await this.dbService.getMetersCache();
      this.metersList.set(cached);
    } catch (e) {
      console.error('Error al cargar caché de medidores:', e);
    }
  }

  selectMeter(meter: IMeterDto): void {
    this.selectedMeter.set(meter);
    this.searchQuery.set('');
    this.noveltyForm.reset({
      tipo: '',
      observacion: '',
    });
    this.photoPreview.set(null);
  }

  clearSelection(): void {
    this.selectedMeter.set(null);
    this.photoPreview.set(null);
    this.noveltyForm.reset();
  }

  onPhotoCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  private async getLatestReadingId(contratoId: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<{ data?: { lecturaId: string }[] }>(
        `${environment.apiUrl}/readings?contratoId=${contratoId}`,
        { withCredentials: true },
      ),
    );
    if (response?.data && response.data.length > 0) {
      return response.data[0].lecturaId;
    }
    throw new Error('No se encontró ninguna lectura asociada al contrato del medidor.');
  }

  async onSubmit(): Promise<void> {
    if (this.noveltyForm.invalid || !this.selectedMeter()) {
      this.noveltyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValue = this.noveltyForm.value;
    const meter = this.selectedMeter()!;

    let lecturaId: string | number = `TEMP_METER_${meter.medidorId}`;

    if (this.networkService.isOnline() && meter.contratoId) {
      try {
        lecturaId = await this.getLatestReadingId(meter.contratoId.toString());
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Error al obtener la lectura para asociar la novedad.';
        this.toastService.error(msg, 'Error');
        this.isSaving.set(false);
        return;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      lecturaId,
      observacion: formValue.observacion,
      tipo: formValue.tipo,
      estado: 'PENDIENTE',
      fotoBase64: this.photoPreview() || null,
      medidorId: meter.medidorId.toString(),
      contratoId: meter.contratoId ? meter.contratoId.toString() : null,
    };

    try {
      await this.syncService.submitAnomaly(payload);
      this.clearSelection();
      this.reportSectionExpanded.set(false);
      // Refresh pending anomalies after successful submission (if online)
      if (this.networkService.isOnline()) {
        this.loadPendingAnomalies();
      }
    } catch (e) {
      console.error('Error al registrar novedad:', e);
    } finally {
      this.isSaving.set(false);
    }
  }

  async forceSync(): Promise<void> {
    await this.syncService.syncPendingData();
  }
}
